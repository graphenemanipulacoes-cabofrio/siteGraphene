import { useState, useEffect, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import Card from './Card';
import ProductContent from './ProductContent';
import { supabase } from '../lib/supabaseClient';

const ProductCarousel = () => {
    const [products, setProducts] = useState([]);
    const scrollContainerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    // Mouse Drag Logic
    const handleMouseDown = (e) => {
        setIsDragging(true);
        setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
        setScrollLeft(scrollContainerRef.current.scrollLeft);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX) * 2; // Scroll-fast
        scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    };

    useEffect(() => {
        const fetchProducts = async () => {
            const { data } = await supabase
                .from('produtos')
                .select('*')
                .order('display_order', { ascending: true })
                .order('created_at', { ascending: true });

            if (data && data.length > 0) {
                setProducts(data);
            } else {
                setProducts([]);
            }
        };
        fetchProducts();
    }, []);

    if (products.length === 0) return null;

    return (
        <section id="products" style={{ padding: '4rem 0' }}>
            <div className="container">
                <h2 className="text-gradient" style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '3rem' }}>
                    Nossas Fórmulas
                </h2>

                {/* DESKTOP VIEW - SWIPER */}
                <div className="desktop-carousel">
                    <Swiper
                        modules={[Pagination, Navigation, Autoplay]}
                        spaceBetween={30}
                        navigation
                        pagination={{ clickable: true }}
                        autoplay={{ delay: 3000, disableOnInteraction: false }}
                        loop={true}
                        centeredSlides={false}
                        slidesPerView={3}
                        style={{ paddingBottom: '3rem' }}
                    >
                        {products.map((product) => (
                            <SwiperSlide key={product.id}>
                                <Card title={product.name} gradient>
                                    <ProductContent product={product} />
                                </Card>
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>

                {/* MOBILE VIEW - NATIVE SCROLL WITH MOUSE SUPPORT */}
                <div className="mobile-carousel">
                    <div
                        className="native-scroll-container"
                        ref={scrollContainerRef}
                        onMouseDown={handleMouseDown}
                        onMouseLeave={handleMouseLeave}
                        onMouseUp={handleMouseUp}
                        onMouseMove={handleMouseMove}
                        style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'pan-x', zIndex: 10, position: 'relative' }}
                    >
                        {products.map((product) => (
                            <div key={product.id} className="mobile-card-wrapper">
                                <Card title={product.name} gradient>
                                    <ProductContent product={product} />
                                </Card>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style>{`
                /* Desktop defaults */
                .desktop-carousel { display: block; }
                .mobile-carousel { display: none; }

                /* Swiper Overrides */
                .swiper-button-next, .swiper-button-prev { color: var(--primary-blue) !important; }
                .swiper-pagination-bullet-active { background: var(--primary-blue) !important; }
                .swiper-pagination-bullet { background: rgba(255,255,255,0.5); }

                @media (max-width: 1024px) {
                    /* On Tablet/Mobile, switch to native scroll */
                    .desktop-carousel { display: none; }
                    .mobile-carousel { display: block; }

                    .native-scroll-container {
                        display: flex;
                        flex-wrap: nowrap;
                        overflow-x: auto; /* standard */
                        overflow-x: scroll; /* force scrollbars behavior */
                        width: 100%;
                        gap: 1rem;
                        padding-bottom: 2rem;
                        padding-right: 20px; /* End padding */
                        scroll-snap-type: x mandatory;
                        -webkit-overflow-scrolling: touch; /* Smooth scroll iOS */
                        scrollbar-width: none; /* Firefox */
                        user-select: none; /* Prevent text selection while dragging */
                        cursor: grab; /* UI Hint */
                        active { cursor: grabbing; }
                    }
                    .native-scroll-container::-webkit-scrollbar {
                        display: none; /* Chrome/Safari */
                    }

                    .mobile-card-wrapper {
                        flex: 0 0 85%; /* Shows 85% of card width */
                        scroll-snap-align: center;
                        height: auto; /* Let content dictate height */
                        /* pointer-events removed to allow touch */
                    }
                    /* Re-enable events on children so buttons work */
                    .mobile-card-wrapper * {
                        pointer-events: auto;
                    }
                }
            `}</style>
        </section>
    );
};

export default ProductCarousel;
