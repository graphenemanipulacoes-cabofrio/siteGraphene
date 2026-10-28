/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import { productOptions, variantKey } from '../utils/productOptions';
import { CustomerCartStore, syncCustomerCart } from '../utils/cartPersistence';
import { CouponProvider } from './CouponContext';

const StoreContext = createContext(null);

export const StoreProvider = ({ children }) => {
    const [cartState, setCartState] = useState({ cart: [], cartReady: false, cartSyncing: false, cartSyncError: null });
    const [cartStore] = useState(() => {
        let storage;
        try { storage = window.localStorage; } catch { /* Storage can be unavailable in private browsing. */ }
        return new CustomerCartStore({ storage, syncRemote: (userId, operations) => syncCustomerCart(supabase, userId, operations) });
    });
    const { cart, cartReady, cartSyncing, cartSyncError } = cartState;
    // CEP do cliente: digitado uma vez (produto, carrinho ou checkout) e reaproveitado.
    const [zip, setZipState] = useState(() => { try { return localStorage.getItem('graphene_cep') || ''; } catch { return ''; } });
    const setZip = useCallback(value => {
        const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
        setZipState(digits);
        try { localStorage.setItem('graphene_cep', digits); } catch { /* Vale só nesta visita. */ }
    }, []);
    const [customer, setCustomer] = useState(null);
    const [authReady, setAuthReady] = useState(false);
    useEffect(() => {
        return cartStore.subscribe(setCartState);
    }, [cartStore]);

    useEffect(() => {
        let active = true;
        let authVersion = 0;
        const requestedVersion = authVersion;
        supabase.auth.getSession().then(({ data }) => {
            if (!active || requestedVersion !== authVersion) return;
            void cartStore.activate(data.session?.user?.id || null);
            setCustomer(data.session?.user || null);
            setAuthReady(true);
        }).catch(() => {
            if (active && requestedVersion === authVersion) {
                void cartStore.activate(null);
                setAuthReady(true);
            }
        });

        const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
            authVersion += 1;
            // This only updates the local owner immediately. Network work is
            // deferred to a microtask, outside Supabase's synchronous callback.
            void cartStore.activate(session?.user?.id || null);
            setCustomer(session?.user || null);
            setAuthReady(true);
        });

        return () => { active = false; subscription.subscription.unsubscribe(); cartStore.deactivate(); };
    }, [cartStore]);

    useEffect(() => {
        if (!authReady) return;
        void cartStore.activate(customer?.id || null);
        const refresh = () => { if (document.visibilityState !== 'hidden') void cartStore.flush(); };
        const timer = window.setInterval(refresh, 20000);
        window.addEventListener('focus', refresh);
        window.addEventListener('online', refresh);
        document.addEventListener('visibilitychange', refresh);
        return () => {
            window.clearInterval(timer);
            window.removeEventListener('focus', refresh);
            window.removeEventListener('online', refresh);
            document.removeEventListener('visibilitychange', refresh);
        };
    }, [authReady, customer?.id, cartStore]);

    // choice = { size, sizeLabel, flavor, flavorLabel, price } quando o produto tem opções.
    const addItem = useCallback((product, choice = {}, units = 1) => {
        const amount = Math.max(1, Math.min(20, Number.isInteger(units) ? units : 1));
        const options = productOptions(product);
        if ((options.hasSizes && !choice.size) || (options.hasFlavors && !choice.flavor)) {
            toast.error('Escolha a quantidade e o sabor antes de continuar.'); return false;
        }
        const parsedPrice = Number(String(choice.price ?? product.price ?? '').replace(',', '.'));
        const price = Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : null;

        if (!price) { toast.error('Este produto ainda não tem um preço para compra.'); return false; }
        const key = variantKey(product.id, choice.size, choice.flavor);
        if (cartStore.items.some(item => item.key === key && item.quantity >= 20)) {
            toast.info('Limite de 20 unidades por produto.'); return false;
        }

        const added = cartStore.add({
                key,
                id: String(product.id),
                name: product.name,
                description: product.description || '',
                image_url: product.image_url,
                size: choice.size || null,
                sizeLabel: choice.sizeLabel || null,
                flavor: choice.flavor || null,
                flavorLabel: choice.flavorLabel || null,
                price,
                quantity: amount,
        });
        if (!added) toast.info('Seu carrinho pode ter até 50 produtos diferentes.');
        return added;
    }, [cartStore]);

    const updateQuantity = useCallback((key, quantity) => {
        cartStore.quantity(key, quantity);
    }, [cartStore]);

    const removeItem = useCallback(key => cartStore.remove(key), [cartStore]);
    const clearCart = useCallback(() => cartStore.clear(), [cartStore]);
    const settleCart = useCallback((orderId, items) => cartStore.settle(orderId, items), [cartStore]);
    const syncCart = useCallback(async () => {
        const ok = await cartStore.flush();
        return { ok, items: cartStore.items.map(item => ({ ...item })), userId: cartStore.userId };
    }, [cartStore]);

    const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
    const subtotal = cart.reduce((total, item) => total + item.quantity * (item.price || 0), 0);

    const value = useMemo(() => ({
        cart, customer, authReady, cartReady, cartSyncing, cartSyncError, syncCart, itemCount, subtotal, zip, setZip,
        addItem, updateQuantity, removeItem, clearCart, settleCart,
    }), [cart, customer, authReady, cartReady, cartSyncing, cartSyncError, syncCart, itemCount, subtotal, zip, setZip, addItem, updateQuantity, removeItem, clearCart, settleCart]);

    return <StoreContext.Provider value={value}><CouponProvider key={customer?.id || 'guest'} userId={customer?.id} subtotal={subtotal}>{children}</CouponProvider></StoreContext.Provider>;
};

export const useStore = () => {
    const context = useContext(StoreContext);
    if (!context) throw new Error('useStore must be used inside StoreProvider');
    return context;
};
