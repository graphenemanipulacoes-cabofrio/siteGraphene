import React from 'react';
import GrapheneBackground from '../components/GrapheneBackground';
import Header from '../components/Header';
import HeroSection from '../components/HeroSection';
import CompoundMatrix from '../components/CompoundMatrix';
import LabShowcase from '../components/LabShowcase';
import DoctorSimulator from '../components/DoctorSimulator';
import PrescriptionTerminal from '../components/PrescriptionTerminal';
import TrustWall from '../components/TrustWall';
import Footer from '../components/Footer';
import FloatingWhatsApp from '../components/FloatingWhatsApp';
import { Toaster } from 'sonner';

const Landing = () => {
    return (
        <div className="clean-page-root">
            <Toaster position="top-right" richColors />
            
            {/* 0. Malha de Grafeno Sutil em Fundo Fixo */}
            <GrapheneBackground />

            {/* 1. Header Oficial */}
            <Header />

            <main style={{ position: 'relative', zIndex: 1 }}>
                {/* 2. Hero Section */}
                <HeroSection />

                {/* 3. Fórmulas e Produtos em Destaque */}
                <CompoundMatrix />

                {/* 4. O Laboratório Graphène & Rigor Científico */}
                <LabShowcase />

                {/* 5. Portal de Prescritores (Médicos & Nutricionistas) */}
                <DoctorSimulator />

                {/* 6. Central de Envio de Receita Médica */}
                <PrescriptionTerminal />

                {/* 7. Avaliações & Prova Social */}
                <TrustWall />
            </main>

            {/* 8. Rodapé Institucional & WhatsApp */}
            <Footer />
            <FloatingWhatsApp />

            <style>{`
                .clean-page-root {
                    display: flex;
                    flex-direction: column;
                    min-height: 100vh;
                    background-color: transparent;
                    color: var(--text-white);
                    overflow-x: hidden;
                    position: relative;
                }

                main {
                    flex: 1;
                }
            `}</style>
        </div>
    );
};

export default Landing;
