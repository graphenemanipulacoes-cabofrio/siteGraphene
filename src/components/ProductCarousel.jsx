import { useState, useEffect } from 'react';
import Card from './Card';
import ProductContent from './ProductContent';
import { supabase } from '../lib/supabaseClient';

const fallbackProducts = [
    {
        id: '1',
        name: 'Morosil® 500mg Autêntico',
        description: 'Extrato patenteado da Laranja Moro da Sicília. Auxilia no gerenciamento de medidas e suporte metabólico.',
        price: 159.90,
        image_url: '/assets/morosil_new.png'
    },
    {
        id: '2',
        name: 'Melatonina 5mg Sublingual',
        description: 'Indução suave e natural ao sono reparador. Regulação do ritmo circadiano e combate à insônia.',
        price: 49.90,
        image_url: '/assets/melatonina_caps.png'
    },
    {
        id: '3',
        name: 'Ashwagandha KSM-66 300mg',
        description: 'Extrato nobre adaptógeno para controle do cortisol, redução do estresse e clareza mental.',
        price: 65.00,
        image_url: '/assets/ashwagandha.png'
    },
    {
        id: '4',
        name: 'Composto Termogênico',
        description: 'Associação de ativos naturais para estímulo metabólico, gasto energético e disposição.',
        price: 89.90,
        image_url: '/assets/termogenico.png'
    },
    {
        id: '5',
        name: 'Maca Peruana Negra 500mg',
        description: 'Superalimento andino para vigor físico, equilíbrio hormonal e disposição cotidiana.',
        price: 39.90,
        image_url: '/assets/maca_peruana.png'
    },
    {
        id: '6',
        name: 'Creatina Monohidratada 100% Pura',
        description: 'Grau farmacêutico testado para força, resistência muscular e hidratação celular.',
        price: 119.90,
        image_url: '/assets/creatina.jpg'
    }
];

const ProductCarousel = () => {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const { data, error } = await supabase
                    .from('produtos')
                    .select('*')
                    .order('display_order', { ascending: true, nullsFirst: false })
                    .order('created_at', { ascending: true });

                if (!error && data && data.length > 0) {
                    setProducts(data);
                } else {
                    setProducts(fallbackProducts);
                }
            } catch {
                setProducts(fallbackProducts);
            }
        };
        fetchProducts();
    }, []);

    const displayList = products.length > 0 ? products : fallbackProducts;

    return (
        <div className="lux-products-grid">
            {displayList.map((product) => (
                <Card key={product.id}>
                    <ProductContent product={product} />
                </Card>
            ))}

            <style>{`
                .lux-products-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 24px;
                }

                @media (max-width: 1024px) {
                    .lux-products-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                @media (max-width: 640px) {
                    .lux-products-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
};

export default ProductCarousel;
