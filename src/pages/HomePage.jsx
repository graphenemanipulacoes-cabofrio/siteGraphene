import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../components/Header';
import HeroBanner from '../components/HeroBanner';
import BenefitsBar from '../components/BenefitsBar';
import ProductGrid from '../components/ProductGrid';
import AuthenticityRibbon from '../components/AuthenticityRibbon';
import Footer from '../components/Footer';
import FloatingWhatsApp from '../components/FloatingWhatsApp';
import { Toaster } from 'sonner';

const HomePage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const { hash } = useLocation();

    // Links como "/#produtos" vindos de outras páginas levam direto à seção.
    useEffect(() => {
        if (!hash) return undefined;
        const timer = setTimeout(() => document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
        return () => clearTimeout(timer);
    }, [hash]);

    return (
        <div className="page-root">
            <Toaster position="top-right" richColors />
            <Header showSearch onSearchChange={setSearchTerm} searchTerm={searchTerm} />
            <main>
                <HeroBanner />
                <BenefitsBar />
                <ProductGrid searchTerm={searchTerm} />
                <AuthenticityRibbon />
            </main>
            <Footer />
            <FloatingWhatsApp />
        </div>
    );
};

export default HomePage;
