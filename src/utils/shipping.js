import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Frete: as regras ficam no painel admin (Frete e entrega) e o cálculo é feito
// no banco (shipping_quote). O pedido usa o mesmo cálculo, então o valor
// mostrado aqui é o mesmo cobrado no pagamento.
export const STORE_ADDRESS = 'Rua Itajuru, 300 (Lojas 5 e 6) — Centro, Cabo Frio/RJ';
export const WHATSAPP_URL = 'https://wa.me/5522999361256';

export const cleanZip = value => String(value || '').replace(/\D/g, '').slice(0, 8);
export const formatZip = value => {
    const digits = cleanZip(value);
    return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
};

export async function quoteShipping(zip, subtotal = 0) {
    const { data, error } = await supabase.rpc('shipping_quote', { p_zip: cleanZip(zip), p_subtotal: Number(subtotal) || 0 });
    if (error) throw new Error('Não foi possível calcular o frete agora. Tente de novo.');
    return data;
}

// Texto curto para mostrar o resultado da cotação.
export function deliveryText(quote) {
    if (!quote?.ok) return null;
    if (quote.local) return {
        title: 'Região dos Lagos: entrega local',
        detail: 'Entrega por motoboy ou retirada na loja. Depois da compra, combinamos o melhor jeito pelo WhatsApp.',
        price: 'A combinar',
    };
    const days = quote.days_min && quote.days_max ? `${quote.days_min} a ${quote.days_max} dias úteis` : null;
    return {
        title: quote.label,
        detail: [days, quote.free ? 'Frete grátis neste pedido' : null].filter(Boolean).join(' · '),
        price: quote.free ? 'Grátis' : null,
    };
}

// Configuração pública do frete (valor mínimo para frete grátis).
let configCache = null;
export function loadShippingConfig(force = false) {
    if (!configCache || force) {
        configCache = supabase.from('loja_config').select('frete,updated_at').eq('id', 1).maybeSingle()
            .then(({ data, error }) => {
                if (error) { configCache = null; throw error; }
                return data?.frete || {};
            });
    }
    return configCache;
}

export function useShippingConfig() {
    const [config, setConfig] = useState(null);
    useEffect(() => {
        let active = true;
        loadShippingConfig().then(value => { if (active) setConfig(value); }).catch(() => { if (active) setConfig({}); });
        return () => { active = false; };
    }, []);
    return config;
}

// Cotação que acompanha o CEP e o valor dos produtos (o frete grátis depende do valor).
export function useShippingQuote(zip, subtotal) {
    const [state, setState] = useState({ key: '', quote: null, error: '' });
    const key = `${cleanZip(zip)}|${Number(subtotal || 0).toFixed(2)}`;
    useEffect(() => {
        if (cleanZip(zip).length !== 8) return undefined;
        let active = true;
        quoteShipping(zip, subtotal)
            .then(quote => { if (active) setState({ key, quote, error: quote?.ok ? '' : quote?.error === 'invalid_zip' ? 'CEP não encontrado. Confira os números.' : 'Ainda não entregamos neste CEP pelo site. Fale com a gente no WhatsApp.' }); })
            .catch(failure => { if (active) setState({ key, quote: null, error: failure.message }); });
        return () => { active = false; };
    }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
    const current = state.key === key && cleanZip(zip).length === 8;
    return { quote: current ? state.quote : null, error: current ? state.error : '', loading: cleanZip(zip).length === 8 && !current };
}

// Endereço pelo CEP (ViaCEP). Se falhar, o cliente preenche à mão.
export async function lookupAddress(zip) {
    const digits = cleanZip(zip);
    if (digits.length !== 8) return null;
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal: controller.signal });
        clearTimeout(timer);
        if (!response.ok) return null;
        const data = await response.json();
        if (data.erro) return null;
        return { address: data.logradouro || '', neighborhood: data.bairro || '', city: data.localidade || '', state: data.uf || '' };
    } catch {
        return null;
    }
}
