import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { CustomerCartStore, CART_CACHE_PREFIX, normalizeCart, applyCartOperation, syncCustomerCart } from '../src/utils/cartPersistence.js';

const accountA = randomUUID();
const accountB = randomUUID();
const line = (id, quantity = 1, extra = {}) => normalizeCart([{ id: String(id), quantity, name: `Produto ${id}`, price: 39.9, ...extra }])[0];
const copy = value => structuredClone(value);
const memoryStorage = () => {
    const entries = new Map();
    return { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
};
const database = () => {
    const carts = new Map();
    const receipts = new Set();
    return {
        carts,
        async syncRemote(userId, operations) {
            let items = carts.get(userId) || [];
            for (const operation of operations) {
                const receipt = `${userId}:${operation.id}`;
                if (receipts.has(receipt)) continue;
                items = applyCartOperation(items, operation);
                receipts.add(receipt);
            }
            carts.set(userId, items);
            return { items: copy(items) };
        },
    };
};
const finish = async store => { assert.equal(await store.flush(), true); };

// Product variants get separate identities; old and malformed cache entries
// cannot smuggle a foreign key, unbounded descriptions or impossible quantities.
{
    const items = normalizeCart([
        { ...line(10), key: 'someone-elses-key', quantity: 900, description: 'x'.repeat(6000) },
        { id: 'not-a-product', quantity: 1 }, { id: '11', quantity: -1 }, null,
        { ...line(10), size: '60-capsulas', flavor: 'natural' },
    ]);
    assert.equal(items.length, 2);
    assert.equal(items[0].key, '10||');
    assert.equal(items[0].quantity, 20);
    assert.equal(items[0].description.length, 4000);
    assert.equal(items[1].key, '10|60-capsulas|natural');
}

// A product added on a phone survives a complete new store, logout and login,
// and is restored on a second browser that has no local cache whatsoever.
{
    const db = database();
    const storage = memoryStorage();
    const phone = new CustomerCartStore({ storage, syncRemote: db.syncRemote });
    await phone.activate(accountA);
    phone.add(line(1, 2));
    await finish(phone);
    await phone.activate(null);
    assert.deepEqual(phone.items, []);
    await phone.activate(accountB);
    assert.deepEqual(phone.items, [], 'Account B must not inherit account A products');
    await phone.activate(accountA);
    assert.equal(phone.items[0].quantity, 2);
    const desktop = new CustomerCartStore({ storage: memoryStorage(), syncRemote: db.syncRemote });
    await desktop.activate(accountA);
    assert.deepEqual(desktop.items, phone.items);
    assert.equal(JSON.parse(storage.getItem(`${CART_CACHE_PREFIX}${accountA}`)).items[0].id, '1');
}

// Simultaneous devices do not replace each other's entire cart. A refresh reads
// the shared server state; variant quantities are bounded independently.
{
    const db = database();
    const a = new CustomerCartStore({ storage: memoryStorage(), syncRemote: db.syncRemote });
    const b = new CustomerCartStore({ storage: memoryStorage(), syncRemote: db.syncRemote });
    await Promise.all([a.activate(accountA), b.activate(accountA)]);
    a.add(line(1, 3)); b.add(line(2, 4));
    await Promise.all([finish(a), finish(b)]);
    await Promise.all([finish(a), finish(b)]);
    assert.equal(a.items.length, 2);
    assert.deepEqual(a.items, b.items);
    a.add(line(1, 20)); await finish(a);
    assert.equal(a.items.find(item => item.id === '1').quantity, 20);
    b.add(line(1, 1, { size: '60-capsulas', flavor: 'natural' })); await finish(b);
    await finish(a);
    assert.equal(a.items.length, 3);
    a.quantity('1||', 5); await finish(a);
    b.remove('2||'); await finish(b); await finish(a);
    assert.equal(a.items.find(item => item.key === '1||').quantity, 5);
    assert.equal(a.items.some(item => item.id === '2'), false);
}

// A lost response after commit must not double an add. Pending operations keep
// their IDs across a browser restart and are safely acknowledged on retry.
{
    const db = database();
    const storage = memoryStorage();
    let loseNextResponse = false;
    const store = new CustomerCartStore({ storage, syncRemote: async (id, operations) => {
        const result = await db.syncRemote(id, operations);
        if (loseNextResponse) { loseNextResponse = false; throw new Error('connection_lost_after_commit'); }
        return result;
    } });
    await store.activate(accountA);
    loseNextResponse = true;
    store.add(line(3, 2));
    assert.equal(await store.flush(), false);
    assert.equal(store.items[0].quantity, 2);
    assert.equal(store.operations.length, 1);
    assert.match(store.error, /mantidos neste aparelho/);
    const reopened = new CustomerCartStore({ storage, syncRemote: db.syncRemote });
    await reopened.activate(accountA);
    assert.equal(reopened.items[0].quantity, 2, 'Retried add must not run twice');
    assert.equal(reopened.operations.length, 0);
    assert.equal(reopened.error, null);
}

// Offline edits remain durable in the account cache, including when a different
// person logs into the same browser before the original customer returns.
{
    const db = database();
    const storage = memoryStorage();
    let offline = false;
    const store = new CustomerCartStore({ storage, syncRemote: async (...args) => {
        if (offline) throw new Error('offline');
        return db.syncRemote(...args);
    } });
    await store.activate(accountA);
    offline = true;
    store.add(line(4, 2));
    assert.equal(await store.flush(), false);
    await store.activate(null);
    assert.deepEqual(store.items, []);
    offline = false;
    await store.activate(accountB);
    assert.deepEqual(store.items, []);
    await store.activate(accountA);
    assert.equal(store.items[0].id, '4');
    assert.equal(db.carts.get(accountA)[0].quantity, 2);
    assert.deepEqual(db.carts.get(accountB), []);
}

// Changes made while a previous request is in flight are rebased over the
// response and sent next; they are never replaced by the earlier snapshot.
{
    const db = database();
    let release;
    let waitForResponse = false;
    const store = new CustomerCartStore({ storage: memoryStorage(), syncRemote: async (...args) => {
        const result = await db.syncRemote(...args);
        if (waitForResponse) { waitForResponse = false; await new Promise(resolve => { release = resolve; }); }
        return result;
    } });
    await store.activate(accountA);
    waitForResponse = true;
    store.add(line(5));
    const completion = store.flush();
    await new Promise(resolve => setImmediate(resolve));
    store.add(line(6, 3));
    release();
    await completion;
    assert.equal(store.items.length, 2);
    assert.equal(store.operations.length, 0);
    assert.equal(db.carts.get(accountA).find(item => item.id === '6').quantity, 3);
}

// A slow request for A cannot populate B's cart after an account switch.
{
    const db = database();
    db.carts.set(accountA, [line(7)]);
    let release;
    let slow = true;
    const store = new CustomerCartStore({ storage: memoryStorage(), syncRemote: async (id, operations) => {
        const result = await db.syncRemote(id, operations);
        if (id === accountA && slow) { slow = false; await new Promise(resolve => { release = resolve; }); }
        return result;
    } });
    const pending = store.activate(accountA);
    await new Promise(resolve => setImmediate(resolve));
    await store.activate(accountB);
    release();
    assert.equal(await pending, false);
    assert.deepEqual(store.items, []);
    assert.equal(store.userId, accountB);
}

// Even a switch before the network microtask starts cannot leave the guest
// falsely marked as syncing or run a request for the previous account.
{
    let calls = 0;
    const store = new CustomerCartStore({ storage: memoryStorage(), syncRemote: async () => { calls += 1; return { items: [] }; } });
    const pending = store.activate(accountA);
    await store.activate(null);
    assert.equal(await pending, false);
    assert.equal(calls, 0);
    assert.equal(store.syncing, false);
    assert.equal(store.ready, true);
}

// Legacy local carts are adopted once and merged, not summed, into an existing
// account cart. Signing into another account must not repeat the adoption.
{
    const db = database();
    db.carts.set(accountA, [line(8, 2)]);
    const storage = memoryStorage();
    storage.setItem('graphene_cart', JSON.stringify([line(8, 2)]));
    const store = new CustomerCartStore({ storage, syncRemote: db.syncRemote });
    await store.activate(null);
    assert.deepEqual(store.items, [], 'Legacy products must not be exposed before identifying the account');
    await store.activate(accountA);
    assert.equal(store.items[0].quantity, 2);
    assert.equal(storage.getItem('graphene_cart'), null);
    await store.activate(accountB);
    assert.deepEqual(store.items, []);
}

// Storage quotas must not cause removal of the only copy of a legacy cart.
{
    const db = database();
    const storage = memoryStorage();
    storage.setItem('graphene_cart', JSON.stringify([line(12)]));
    const limitedStorage = { ...storage, setItem: () => { throw new Error('QuotaExceededError'); } };
    const store = new CustomerCartStore({ storage: limitedStorage, syncRemote: db.syncRemote });
    await store.activate(accountA);
    assert.notEqual(storage.getItem('graphene_cart'), null);
    assert.equal(store.items[0].id, '12');
}

// Settlement only removes the paid variants, not unrelated/new products. Its
// operation ID is the order ID, so a second device cannot settle it twice.
{
    const db = database();
    const orderId = randomUUID();
    const store = new CustomerCartStore({ storage: memoryStorage(), syncRemote: db.syncRemote });
    await store.activate(accountA);
    store.add(line(9, 4, { size: '60-capsulas', flavor: 'natural' }));
    store.add(line(9, 1, { size: '120-capsulas', flavor: 'natural' }));
    await finish(store);
    const purchased = [{ product_id: 9, quantity: 2, variant: { size: '60-capsulas', flavor: 'natural' } }];
    store.settle(orderId, purchased); await finish(store);
    assert.equal(store.items.find(item => item.size === '60-capsulas').quantity, 2);
    assert.equal(store.items.find(item => item.size === '120-capsulas').quantity, 1);
    store.settle(orderId, purchased); await finish(store);
    assert.equal(store.items.find(item => item.size === '60-capsulas').quantity, 2);
    const secondDevice = new CustomerCartStore({ storage: memoryStorage(), syncRemote: db.syncRemote });
    await secondDevice.activate(accountA);
    secondDevice.settle(orderId, purchased); await finish(secondDevice);
    assert.equal(secondDevice.items.find(item => item.size === '60-capsulas').quantity, 2);
}

// RPC requests are pinned to the captured account's access token. Authentication
// is checked before issuing any request and a later global session change
// cannot make account A's queued edits apply to account B.
{
    let requested = false;
    let capturedHeader;
    const client = {
        auth: { getSession: async () => ({ data: { session: { user: { id: accountA }, access_token: 'account-a-test-token' } } }) },
        rpc(name, payload) {
            requested = true;
            assert.equal(name, 'customer_cart_sync');
            assert.deepEqual(payload, { p_operations: [] });
            return { setHeader(name, value) {
                assert.equal(name, 'Authorization'); capturedHeader = value;
                return { abortSignal: async signal => { assert.equal(signal.aborted, false); return { data: { items: [] }, error: null }; } };
            } };
        },
    };
    await syncCustomerCart(client, accountA, []);
    assert.equal(capturedHeader, 'Bearer account-a-test-token');
    requested = false;
    await assert.rejects(() => syncCustomerCart(client, accountB, []), /customer_session_changed/);
    assert.equal(requested, false);
}

// These are structural guards, not a substitute for applying and testing the
// migration against the project's PostgreSQL instance.
const sql = await readFile(new URL('../supabase/migrations/202610230003_customer_carts.sql', import.meta.url), 'utf8');
assert.match(sql, /v_customer_id uuid := auth\.uid\(\)/);
assert.match(sql, /customer_carts enable row level security/);
assert.match(sql, /customer_cart_operations enable row level security/);
assert.match(sql, /revoke all on public\.customer_carts from public, anon, authenticated/);
assert.match(sql, /using \(\(select auth\.uid\(\)\) = customer_id\)/);
assert.match(sql, /where customer_id = v_customer_id for update/);
assert.match(sql, /primary key \(customer_id, operation_id\)/);
assert.match(sql, /payment_status = 'paid'/);
assert.match(sql, /from public\.order_items where order_id = v_order_id/);
assert.match(sql, /grant execute on function public\.customer_cart_sync\(jsonb\) to authenticated/);
console.log('Customer cart checks passed: account isolation, cross-device restore, variants, concurrent edits, offline recovery, lost-response retry, legacy migration, paid-order settlement, pinned authentication and migration security guards.');
