// The cache is only a local safety net. The signed-in customer's cart lives in
// Supabase and is changed through small, idempotent operations, never a blind
// replacement of the entire cart from whichever device happened to save last.
export const CART_CACHE_PREFIX = 'graphene_cart_account:';
const GUEST_CACHE_KEY = 'graphene_cart_guest';
const LEGACY_CART_KEY = 'graphene_cart';
const LEGACY_OWNER_KEY = 'graphene_cart_migrated_to';
const MAX_LINES = 50;
const MAX_QUANTITY = 20;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const text = (value, limit) => typeof value === 'string' ? value.slice(0, limit) : '';
const selection = value => typeof value === 'string' && value.length <= 120 && !value.includes('|') ? value : null;
export const cartLineKey = (id, size, flavor) => [String(id), size || '', flavor || ''].join('|');

export function normalizeCart(items) {
    if (!Array.isArray(items)) return [];
    const lines = new Map();
    for (const item of items.slice(0, MAX_LINES)) {
        if (!item || !/^\d{1,19}$/.test(String(item.id)) || !Number.isInteger(item.quantity) || item.quantity < 1) continue;
        const id = String(item.id);
        const size = selection(item.size);
        const flavor = selection(item.flavor);
        const price = Number(item.price);
        const key = cartLineKey(id, size, flavor);
        lines.set(key, {
            id, key, size, flavor,
            name: text(item.name, 300),
            description: text(item.description, 4000),
            image_url: text(item.image_url, 2048),
            sizeLabel: text(item.sizeLabel, 160) || null,
            flavorLabel: text(item.flavorLabel, 160) || null,
            price: Number.isFinite(price) && price > 0 ? Math.min(price, 999999.99) : null,
            quantity: Math.min(item.quantity, MAX_QUANTITY),
        });
    }
    return [...lines.values()];
}

export function applyCartOperation(items, operation) {
    if (operation.type === 'clear') return [];
    if (operation.type === 'settle') {
        return items.flatMap(item => {
            const purchased = (operation.items || []).reduce((total, line) => cartLineKey(line.product_id, line.variant?.size, line.variant?.flavor) === item.key ? total + Number(line.quantity || 0) : total, 0);
            const quantity = item.quantity - purchased;
            return quantity > 0 ? [{ ...item, quantity }] : [];
        });
    }
    if (operation.type === 'remove') return items.filter(item => item.key !== operation.key);
    if (operation.type === 'quantity') {
        return items.flatMap(item => item.key !== operation.key ? [item] : operation.quantity > 0 ? [{ ...item, quantity: Math.min(operation.quantity, MAX_QUANTITY) }] : []);
    }
    const line = normalizeCart([operation.item])[0];
    if (!line) return items;
    const existing = items.find(item => item.key === line.key);
    if (existing) {
        const quantity = operation.type === 'merge' ? Math.max(existing.quantity, line.quantity) : Math.min(existing.quantity + line.quantity, MAX_QUANTITY);
        return items.map(item => item.key === line.key ? { ...line, quantity } : item);
    }
    return items.length < MAX_LINES ? [...items, line] : items;
}

const read = (storage, key, fallback) => {
    try { return JSON.parse(storage?.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
};
const write = (storage, key, value) => {
    try {
        if (!storage) return false;
        storage.setItem(key, JSON.stringify(value));
        return true;
    } catch { return false; /* The in-memory cart remains usable. */ }
};
const normalizeOperation = operation => {
    if (!operation || !UUID.test(operation.id)) return null;
    const base = { id: operation.id, type: operation.type };
    if (operation.type === 'clear') return base;
    if (operation.type === 'settle') return operation.order_id === operation.id ? { ...base, order_id: operation.order_id, items: Array.isArray(operation.items) ? operation.items.slice(0, MAX_LINES) : [] } : null;
    if (operation.type === 'add' || operation.type === 'merge') {
        const item = normalizeCart([operation.item])[0];
        return item ? { ...base, item } : null;
    }
    if (typeof operation.key !== 'string' || operation.key.length > 262) return null;
    if (operation.type === 'remove') return { ...base, key: operation.key };
    if (operation.type === 'quantity' && Number.isInteger(operation.quantity) && operation.quantity >= 0 && operation.quantity <= MAX_QUANTITY) return { ...base, key: operation.key, quantity: operation.quantity };
    return null;
};

export class CustomerCartStore {
    constructor({ storage, syncRemote, makeId = () => crypto.randomUUID(), onState = () => {} }) {
        this.storage = storage;
        this.syncRemote = syncRemote;
        this.makeId = makeId;
        this.onState = onState;
        this.generation = 0;
        this.userId = null;
        this.items = [];
        this.operations = [];
        this.settledOrders = [];
        this.ready = false;
        this.syncing = false;
        this.error = null;
        this.running = null;
        this.initialized = false;
    }

    emit() {
        this.onState({ cart: this.items, cartReady: this.ready, cartSyncing: this.syncing, cartSyncError: this.error });
    }

    subscribe(listener) {
        this.onState = listener;
        return () => { this.onState = () => {}; };
    }

    persist() {
        if (this.userId) {
            return write(this.storage, `${CART_CACHE_PREFIX}${this.userId}`, { version: 1, items: this.items, operations: this.operations, settledOrders: this.settledOrders });
        }
        return write(this.storage, GUEST_CACHE_KEY, this.items);
    }

    activate(userId) {
        const nextUserId = userId || null;
        if (this.initialized && nextUserId === this.userId) return this.running || Promise.resolve(this.ready);
        this.initialized = true;
        this.generation += 1;
        this.running = null;
        this.userId = nextUserId;
        this.error = null;
        this.syncing = false;
        this.settledOrders = [];
        if (!this.userId) {
            this.items = normalizeCart(read(this.storage, GUEST_CACHE_KEY, []));
            this.operations = [];
            this.ready = true;
            this.emit();
            return Promise.resolve(true);
        }
        const cached = read(this.storage, `${CART_CACHE_PREFIX}${this.userId}`, {});
        this.items = normalizeCart(cached.items);
        this.operations = Array.isArray(cached.operations) ? cached.operations.map(normalizeOperation).filter(Boolean) : [];
        this.settledOrders = Array.isArray(cached.settledOrders) ? cached.settledOrders.filter(id => UUID.test(id)).slice(-50) : [];
        // Adopt the old, device-only cart once. Merge uses the greater quantity,
        // so an already-saved account cart is not accidentally doubled.
        const legacyOwner = read(this.storage, LEGACY_OWNER_KEY, null);
        const legacy = legacyOwner ? [] : normalizeCart(read(this.storage, LEGACY_CART_KEY, []));
        const guest = normalizeCart(read(this.storage, GUEST_CACHE_KEY, []));
        for (const item of [...legacy, ...guest]) {
            const operation = { id: this.makeId(), type: 'merge', item };
            this.operations.push(operation);
            this.items = applyCartOperation(this.items, operation);
        }
        this.ready = false;
        const cachedSafely = this.persist();
        // Only remove the shared legacy key after saving its account-scoped copy.
        try {
            if (cachedSafely) {
                this.storage.setItem(LEGACY_OWNER_KEY, JSON.stringify(this.userId));
                this.storage.removeItem(LEGACY_CART_KEY);
                this.storage.removeItem(GUEST_CACHE_KEY);
            }
        } catch { /* A retry still uses merge, not a duplicate addition. */ }
        this.emit();
        return this.flush();
    }

    deactivate() {
        this.generation += 1;
        this.running = null;
        this.userId = null;
        this.initialized = false;
    }

    dispatch(operation) {
        const next = applyCartOperation(this.items, operation);
        if (next === this.items) return false;
        this.items = next;
        if (this.userId) this.operations.push(operation);
        this.persist();
        this.emit();
        if (this.userId) void this.flush();
        return true;
    }

    add(item) {
        if (this.items.length >= MAX_LINES && !this.items.some(line => line.key === item.key)) return false;
        return this.dispatch({ id: this.makeId(), type: 'add', item });
    }

    quantity(key, quantity) { return this.dispatch({ id: this.makeId(), type: 'quantity', key, quantity: Math.max(0, Math.min(Number.isInteger(quantity) ? quantity : 0, MAX_QUANTITY)) }); }
    remove(key) { return this.dispatch({ id: this.makeId(), type: 'remove', key }); }
    clear() { return this.dispatch({ id: this.makeId(), type: 'clear' }); }

    settle(orderId, items) {
        if (!UUID.test(orderId) || this.settledOrders.includes(orderId)) return;
        this.settledOrders = [...this.settledOrders, orderId].slice(-50);
        this.dispatch({ id: orderId, type: 'settle', order_id: orderId, items });
    }

    flush() {
        if (!this.userId) return Promise.resolve(true);
        if (this.running) return this.running;
        const userId = this.userId;
        const generation = this.generation;
        const task = async () => {
            if (generation !== this.generation) return false;
            this.syncing = true;
            this.emit();
            try {
                do {
                    const batch = this.operations.slice(0, 100);
                    const result = await this.syncRemote(userId, batch);
                    if (generation !== this.generation) return false;
                    const completed = new Set(batch.map(operation => operation.id));
                    this.operations = this.operations.filter(operation => !completed.has(operation.id));
                    this.items = this.operations.reduce(applyCartOperation, normalizeCart(result.items));
                    this.error = null;
                    this.ready = true;
                    this.persist();
                    this.emit();
                } while (this.operations.length);
                return true;
            } catch {
                if (generation !== this.generation) return false;
                this.ready = true;
                this.error = 'Não foi possível sincronizar seu carrinho com a conta. Os produtos foram mantidos neste aparelho e tentaremos novamente.';
                this.persist();
                return false;
            } finally {
                if (generation === this.generation) {
                    this.syncing = false;
                    this.running = null;
                    this.emit();
                }
            }
        };
        // Start on a microtask so a synchronous fake/network failure cannot run
        // finally before the running promise has been assigned.
        this.running = Promise.resolve().then(task);
        return this.running;
    }
}

export async function syncCustomerCart(client, userId, operations) {
    const { data: { session } = {}, error: sessionError } = await client.auth.getSession();
    if (sessionError || session?.user?.id !== userId || !session.access_token) throw new Error('customer_session_changed');
    // Pin this request to the captured account token. A logout/account change
    // during the await must not send the previous account's queued products to
    // the new account through Supabase's current global session.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
        const { data, error } = await client.rpc('customer_cart_sync', { p_operations: operations })
            .setHeader('Authorization', `Bearer ${session.access_token}`)
            .abortSignal(controller.signal);
        if (error || !data || !Array.isArray(data.items)) throw error || new Error('invalid_cart_response');
        return data;
    } finally {
        clearTimeout(timeout);
    }
}
