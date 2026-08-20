import React, { useState } from 'react';
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
