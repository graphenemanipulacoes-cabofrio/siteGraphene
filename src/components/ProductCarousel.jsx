import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import Card from './Card';
import Button from './Button';

const products = [
    { id: 1, name: 'Imunidade Blindada', desc: 'Complexo vitamínico para fortalecer suas defesas naturais.', category: 'Imunidade' },
    { id: 2, name: 'NeuroFocus Pro', desc: 'Nootrópico natural para concentração máxima e clareza mental.', category: 'Foco' },
    { id: 3, name: 'Deep Sleep', desc: 'Fórmula relaxante para um sono reparador e profundo.', category: 'Sono' },
    { id: 4, name: 'Energy Boost', desc: 'Energia limpa para seus treinos e rotina intensa.', category: 'Energia' },
    { id: 5, name: 'Beauty & Glow', desc: 'Nutrientes essenciais para saúde da pele, unhas e cabelos.', category: 'Beleza' },
];

const ProductCarousel = () => {
    return (
        <section id="products" style={{ padding: '4rem 0' }}>
            <div className="container">
                <h2 className="text-gradient" style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '3rem' }}>
                    Nossas Fórmulas
                </h2>

                <Swiper
                    modules={[Pagination, Navigation, Autoplay]}
                    spaceBetween={30}
                    slidesPerView={1}
                    navigation
                    pagination={{ clickable: true }}
                    autoplay={{ delay: 3000 }}
                    breakpoints={{
                        640: { slidesPerView: 2 },
                        1024: { slidesPerView: 3 },
                    }}
                    style={{ paddingBottom: '3rem' }}
                >
                    {products.map((product) => (
                        <SwiperSlide key={product.id}>
                            <Card title={product.name} gradient>
                                <div style={{ height: '150px', background: 'rgba(0,229,255,0.1)', borderRadius: '10px', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ fontSize: '3rem', opacity: 0.5 }}>💊</span>
                                </div>
                                <p style={{ color: 'var(--text-gray)', marginBottom: '1.5rem' }}>{product.desc}</p>
                                <Button variant="outline" style={{ width: '100%', justifyContent: 'center' }}>Quero saber mais</Button>
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
