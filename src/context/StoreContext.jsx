/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const StoreContext = createContext(null);
const CART_KEY = 'graphene_cart';

const readCart = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
};

export const StoreProvider = ({ children }) => {
    const [cart, setCart] = useState(readCart);
    const [customer, setCustomer] = useState(null);
    const [authReady, setAuthReady] = useState(false);

    useEffect(() => {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
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

        setCart(current => {
            const existing = current.find(item => item.id === String(product.id));
            if (existing) {
                return current.map(item => item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...current, {
                id: String(product.id),
                name: product.name,
                image_url: product.image_url,
                price,
                quantity: 1,
            }];
        });
        return true;
    }, []);

    const updateQuantity = useCallback((id, quantity) => {
        setCart(current => current.flatMap(item => {
            if (item.id !== id) return [item];
            return quantity > 0 ? [{ ...item, quantity }] : [];
        }));
    }, []);

    const removeItem = useCallback((id) => setCart(current => current.filter(item => item.id !== id)), []);
    const clearCart = useCallback(() => setCart([]), []);

    const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
    const subtotal = cart.reduce((total, item) => total + item.quantity * (item.price || 0), 0);

    const value = useMemo(() => ({
        cart, customer, authReady, itemCount, subtotal,
        addItem, updateQuantity, removeItem, clearCart,
    }), [cart, customer, authReady, itemCount, subtotal, addItem, updateQuantity, removeItem, clearCart]);

    return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = () => {
    const context = useContext(StoreContext);
    if (!context) throw new Error('useStore must be used inside StoreProvider');
    return context;
};
