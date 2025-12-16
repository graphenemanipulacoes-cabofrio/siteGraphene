import { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import Card from './Card';
import Button from './Button';
import { supabase } from '../lib/supabaseClient';

const ProductCarousel = () => {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        const fetchProducts = async () => {
            const { data } = await supabase
                .from('produtos')
                .select('*')
                .order('created_at', { ascending: true });

            if (data && data.length > 0) {
                setProducts(data);
            } else {
                // Fallback / Initial Data if table is empty (optional, but good for demo)
                // Actually, let's keep it empty or show default if truly empty to avoid breakage
                // For now, let's assume user will add products. If empty, show nothing or placeholder.
                setProducts([]);
            }
        };
        fetchProducts();
    }, []);

    if (products.length === 0) return null; // Don't show section if no products

    return (
        <section id="products" style={{ padding: '4rem 0' }}>
            <div className="container">
                <h2 className="text-gradient" style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '3rem' }}>
                    Nossas Fórmulas ({products.length})
                </h2>

                <Swiper
                    modules={[Pagination, Navigation, Autoplay]}
                    spaceBetween={30}
                    navigation
                    pagination={{ clickable: true }}
                    autoplay={{ delay: 3000, disableOnInteraction: false }}
                    loop={true}
                    centeredSlides={true}
                    slidesPerView={1.1}
                    breakpoints={{
                        640: { slidesPerView: 2, centeredSlides: false },
                        1024: { slidesPerView: 3, centeredSlides: false },
                    }}
                    style={{ paddingBottom: '3rem' }}
                >
                    {products.map((product) => (
                        <SwiperSlide key={product.id}>
                            <Card title={product.name} gradient>
                                <div style={{ height: '250px', border: '2px solid red', background: 'rgba(255,0,0,0.1)', borderRadius: '10px', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    {product.image_url ? (
                                        <>
                                            <img
                                                src={product.image_url}
                                                alt={product.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.parentNode.innerText = 'BROKEN IMG';
                                                }}
                                            />
                                            {/* Debug Text Overlay */}
                                            <span style={{ position: 'absolute', bottom: 0, left: 0, fontSize: '10px', background: 'black' }}>
                                                {product.image_url}
                                            </span>
                                        </>
                                    ) : (
                                        <div style={{ opacity: 0.3, fontSize: '3rem' }}>💊</div>
                                    )}
                                </div>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem', minHeight: '3em' }}>
                                        {product.description}
                                    </p>
                                    {product.price && (
                                        <p className="text-gradient" style={{ fontWeight: 'bold', fontSize: '1.2rem', marginTop: '0.5rem', textAlign: 'center' }}>
                                            R$ {parseFloat(product.price).toFixed(2).replace('.', ',')}
                                        </p>
                                    )}
                                </div>
                                <Button variant="outline" style={{ width: '100%', justifyContent: 'center' }}>Quero este!</Button>
                            </Card>
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>
            <style>{`
        .swiper-button-next, .swiper-button-prev { color: var(--primary-blue) !important; }
        .swiper-pagination-bullet-active { background: var(--primary-blue) !important; }
        .swiper-pagination-bullet { background: rgba(255,255,255,0.5); }
      `}</style>
        </section>
    );
};

export default ProductCarousel;
