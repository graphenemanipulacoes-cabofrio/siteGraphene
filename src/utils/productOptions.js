import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Quantidades (apresentações) e sabores de um produto.
// O preço que vale na compra é recalculado no servidor a partir do cadastro;
// aqui é só para mostrar ao cliente.
export const NATURAL_FLAVOR = 'natural';
export const NATURAL_LABEL = 'Natural (sem sabor)';

const positive = value => {
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0 ? amount : null;
};

export function productOptions(product) {
    const raw = product?.options && typeof product.options === 'object' ? product.options : {};
    const sizes = Array.isArray(raw.sizes) ? raw.sizes.filter(size => size && size.id && size.label) : [];
    // Quantidades sem preço ficam fora da loja até o farmacêutico preencher.
    const availableSizes = sizes.map(size => ({ ...size, price: positive(size.price) })).filter(size => size.price);
    const flavors = Array.isArray(raw.flavors) ? raw.flavors.filter(flavor => typeof flavor === 'string') : [];
    const natural = raw.natural === true;
    return {
        sizes,
        availableSizes,
        flavors,
        natural,
        flavorPrice: positive(raw.flavor_price) || 0,
        hasSizes: sizes.length > 0,
        hasFlavors: natural || flavors.length > 0,
    };
}

// Precisa escolher antes de comprar (quantidade e/ou sabor).
export const requiresChoice = product => {
    const options = productOptions(product);
    return options.hasSizes || options.hasFlavors;
};

export function variantPrice(product, sizeId, flavorId) {
    const options = productOptions(product);
    const base = options.hasSizes ? options.availableSizes.find(size => size.id === sizeId)?.price : positive(product?.price);
    if (!base) return null;
    const extra = options.hasFlavors && flavorId && flavorId !== NATURAL_FLAVOR ? options.flavorPrice : 0;
    return Math.round((base + extra) * 100) / 100;
}

export const variantKey = (productId, size, flavor) => [String(productId), size || '', flavor || ''].join('|');

export const variantText = item => [item.sizeLabel, item.flavorLabel].filter(Boolean).join(' · ');

// Catálogo de sabores (público). Um único carregamento por página.
let flavorCache = null;
export function loadFlavors(force = false) {
    if (!flavorCache || force) {
        flavorCache = supabase.from('sabores').select('id,name,display_order').order('display_order', { ascending: true })
            .then(({ data, error }) => {
                if (error) { flavorCache = null; throw error; }
                return data || [];
            });
    }
    return flavorCache;
}

export function useFlavors() {
    const [flavors, setFlavors] = useState([]);
    useEffect(() => {
        let active = true;
        loadFlavors().then(list => { if (active) setFlavors(list); }).catch(() => { /* Sem catálogo: mostra só o que o produto tem. */ });
        return () => { active = false; };
    }, []);
    return flavors;
}

export const flavorName = (flavors, id) => id === NATURAL_FLAVOR ? NATURAL_LABEL : (flavors.find(flavor => flavor.id === id)?.name || id);
