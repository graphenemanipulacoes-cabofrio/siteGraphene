/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';

const StoreContext = createContext(null);
const CART_KEY = 'graphene_cart';

const readCart = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
        return Array.isArray(saved) ? saved.filter(item => item && item.id && Number.isInteger(item.quantity) && item.quantity > 0).map(item => ({ ...item, id: String(item.id), quantity: Math.min(item.quantity, 20) })) : [];
    } catch {
        return [];
    }
};

export const StoreProvider = ({ children }) => {
    const [cart, setCart] = useState(readCart);
    const [customer, setCustomer] = useState(null);
    const [authReady, setAuthReady] = useState(false);
    const settledOrders = useRef(new Set());

    useEffect(() => {
        try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* The cart remains usable when storage is unavailable. */ }
    }, [cart]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setCustomer(data.session?.user || null);
            setAuthReady(true);
        });

        const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
            setCustomer(session?.user || null);
            setAuthReady(true);
        });

        return () => subscription.subscription.unsubscribe();
    }, []);

    const addItem = useCallback((product) => {
        const parsedPrice = Number(String(product.price ?? '').replace(',', '.'));
        const price = Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : null;

        if (!price) { toast.error('Este produto ainda não tem um preço para compra.'); return false; }
        if (cart.some(item => item.id === String(product.id) && item.quantity >= 20)) {
            toast.info('Limite de 20 unidades por produto.'); return false;
        }

        setCart(current => {
            const existing = current.find(item => item.id === String(product.id));
            if (existing) {
                return current.map(item => item.id === existing.id ? { ...item, price, quantity: Math.min(item.quantity + 1, 20) } : item);
            }
            return [...current, {
                id: String(product.id),
                name: product.name,
                description: product.description || '',
                image_url: product.image_url,
                price,
                quantity: 1,
            }];
        });
        return true;
    }, [cart]);

    const updateQuantity = useCallback((id, quantity) => {
        setCart(current => current.flatMap(item => {
            if (item.id !== id) return [item];
            return quantity > 0 && Number.isInteger(quantity) ? [{ ...item, quantity: Math.min(quantity, 20) }] : [];
        }));
    }, []);

    const removeItem = useCallback((id) => setCart(current => current.filter(item => item.id !== id)), []);
    const clearCart = useCallback(() => setCart([]), []);
    const settleCart = useCallback((orderId, items) => {
        if (settledOrders.current.has(orderId)) return;
        try {
            const settled = JSON.parse(localStorage.getItem('graphene_settled_carts') || '[]');
            if (settled.includes(orderId)) return;
            localStorage.setItem('graphene_settled_carts', JSON.stringify([...settled, orderId].slice(-50)));
        } catch { /* Keep an in-memory guard if storage is unavailable. */ }
        settledOrders.current.add(orderId);
        setCart(current => current.flatMap(item => {
            const purchased = items.find(p => String(p.product_id) === item.id);
            const quantity = item.quantity - Number(purchased?.quantity || 0);
            return quantity > 0 ? [{ ...item, quantity }] : [];
        }));
    }, []);

    const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
    const subtotal = cart.reduce((total, item) => total + item.quantity * (item.price || 0), 0);

    const value = useMemo(() => ({
        cart, customer, authReady, itemCount, subtotal,
        addItem, updateQuantity, removeItem, clearCart, settleCart,
    }), [cart, customer, authReady, itemCount, subtotal, addItem, updateQuantity, removeItem, clearCart, settleCart]);

    return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = () => {
    const context = useContext(StoreContext);
    if (!context) throw new Error('useStore must be used inside StoreProvider');
    return context;
};
