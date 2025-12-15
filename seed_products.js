
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ngphbcrdphluuphctvpr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncGhiY3JkcGhsdXVwaGN0dnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MjE0NzEsImV4cCI6MjA4MTM5NzQ3MX0.g0k4c8ak05CwqnDNW-B2YlQHG33EfgKCmihLCuip-eI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const products = [
    {
        name: 'Melatonina 5mg',
        description: 'Sono reparador, rápido e combate à insônia. Regula o ritmo biológico natural.',
        price: 49.90, // Média de mercado
        image_url: '/assets/melatonina_caps.png'
    },
    {
        name: 'Ashwagandha 300mg',
        description: 'Adaptógeno natural. Reduz estresse, ansiedade e melhora o foco e disposição.',
        price: 65.00, // Média de mercado
        image_url: '/assets/ashwagandha.png'
    },
    // Morosil might already exist from previous manual edits, but user sent a NEW image, so let's add/update nicely.
    // I'll just insert these as new rows. User can delete old ones in admin.
    {
        name: 'Morosil® 500mg',
        description: 'Autêntico extrato da laranja moro. Potente na redução de medidas abdominais.',
        price: 159.90, // Produto premium
        image_url: '/assets/morosil_new.png'
    },
    {
        name: 'Composto Termogênico',
        description: 'Acelerador metabólico avançado. Mais energia e queima calórica eficiente.',
        price: 89.90, // Média
        image_url: '/assets/termogenico.png'
    },
    {
        name: 'Maca Peruana',
        description: 'Superalimento para vigor físico, libido e equilíbrio hormonal.',
        price: 39.90, // Média
        image_url: '/assets/maca_peruana.png'
    }
];

async function seed() {
    console.log("🌱 Seeding products...");

    // Optional: clear table first? No, let's append or user might lose custom work.
    // Actually, maybe better to clear only if we are initializing?
    // User said "Lance esses", implied "Launch these".
    // I'll just insert.

    const { data, error } = await supabase
        .from('produtos')
        .insert(products)
        .select();

    if (error) {
        console.error("❌ Error seeding:", error);
    } else {
        console.log("✅ Success! Added products:", data.length);
    }
}

seed();
