import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FloatingWhatsApp from '../components/FloatingWhatsApp';
import { getWhatsAppUrl } from '../config';
import { ShieldCheck, Sparkles, MessageCircle, FileUp, Award, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const activesList = [
    {
        id: 'ormona',
        name: 'Ormona®',
        lab: 'Ages Bioactive Compounds',
        category: 'Compostos bioativos',
        headline: 'Matéria-prima da Ages Bioactive Compounds',
        description: 'Conheça as informações técnicas disponibilizadas pelo fornecedor. A adequação a uma fórmula individualizada depende de avaliação profissional.',
        tags: ['Ages Bioactive', 'Informações técnicas', 'Uso individualizado']
    },
    {
        id: 'terasen',
        name: 'Terasen®',
        lab: 'Ages Bioactive Compounds',
        category: 'Extratos vegetais',
        headline: 'Bioativos de origem vegetal',
        description: 'Matéria-prima apresentada pela Ages Bioactive Compounds. Nossa equipe pode orientar sobre documentação, composição e disponibilidade.',
        tags: ['Origem vegetal', 'Ages Bioactive', 'Documentação técnica']
    },
    {
        id: 'chronic',
        name: 'Chronic®',
        lab: 'Ages Bioactive Compounds',
        category: 'Extratos vegetais',
        headline: 'Extrato vegetal padronizado',
        description: 'Matéria-prima derivada de Bixa orellana. Consulte nossa equipe sobre suas características técnicas e critérios de utilização.',
        tags: ['Bixa orellana', 'Extrato vegetal', 'Ages Bioactive']
    },
    {
        id: 'glisodin',
        name: 'GliSODin®',
        lab: 'Lemma Supply',
        category: 'Compostos bioativos',
        headline: 'Composição à base de SOD e gliadina',
        description: 'Conheça a composição e a documentação técnica dessa matéria-prima apresentada pela Lemma Supply.',
        tags: ['SOD', 'Gliadina', 'Lemma Supply']
    },
    {
        id: 'mitburn',
        name: 'Mitburn®',
        lab: 'Biodiversité',
        category: 'Extratos vegetais',
        headline: 'Matéria-prima de origem vegetal',
        description: 'Ingrediente apresentado pela Biodiversité. Nossa equipe pode informar características, documentação e disponibilidade.',
        tags: ['Origem vegetal', 'Biodiversité', 'Consulta técnica']
    },
    {
        id: 'zembrin',
        name: 'Zembrin®',
        lab: 'Lemma Supply',
        category: 'Extratos vegetais',
        headline: 'Extrato botânico padronizado',
        description: 'Matéria-prima de Sceletium tortuosum apresentada pela Lemma Supply. Consulte a equipe farmacêutica sobre informações técnicas.',
        tags: ['Sceletium tortuosum', 'Extrato botânico', 'Lemma Supply']
    },
    {
        id: 'exsynutriment',
        name: 'Exsynutriment®',
        lab: 'AQIA • Biotec',
        category: 'Compostos bioativos',
        headline: 'Composto de silício orgânico',
        description: 'Conheça a apresentação e a documentação técnica dessa matéria-prima fornecida pela AQIA Biotec.',
        tags: ['Silício orgânico', 'AQIA Biotec', 'Consulta técnica']
    },
    {
        id: 'drenow-c',
        name: 'Drenow C®',
        lab: 'Florien',
        category: 'Compostos bioativos',
        headline: 'Composição com vitamina C e bioflavonoides',
        description: 'Matéria-prima apresentada pela Florien. Peça informações sobre composição, documentação e disponibilidade.',
        tags: ['Vitamina C', 'Bioflavonoides', 'Florien']
    },
    {
        id: 'akkermat',
        name: 'Akkermat®',
        lab: 'Florien',
        category: 'Compostos bioativos',
        headline: 'Matéria-prima em apresentação beadlets',
        description: 'Ingrediente apresentado pela Florien. Nossa equipe pode esclarecer as especificações técnicas fornecidas pelo fabricante.',
        tags: ['Beadlets', 'Florien', 'Documentação técnica']
    },
    {
        id: 'bio-arct',
        name: 'Bio-Arct®',
        lab: 'AQIA • Biotec',
        category: 'Compostos bioativos',
        headline: 'Matéria-prima de origem marinha',
        description: 'Conheça a composição e as informações técnicas desse ingrediente apresentado pela AQIA Biotec.',
        tags: ['Origem marinha', 'AQIA Biotec', 'Consulta técnica']
    },
    {
        id: 'glycoxil',
        name: 'Glycoxil®',
        lab: 'AQIA • Biotec',
        category: 'Compostos bioativos',
        headline: 'Ingrediente com documentação do fornecedor',
        description: 'Matéria-prima apresentada pela AQIA Biotec. Consulte a equipe para informações sobre composição e critérios de uso.',
        tags: ['AQIA Biotec', 'Informações técnicas', 'Uso individualizado']
    },
    {
        id: 'phytgen',
        name: 'PhyTgen®',
        lab: 'Lemma Supply',
        category: 'Compostos bioativos',
        headline: 'Associação de fucoxantina e óleo de romã',
        description: 'Conheça as características técnicas dessa matéria-prima apresentada pela Lemma Supply. Uso em fórmula sujeito à avaliação profissional.',
        tags: ['Fucoxantina', 'Óleo de romã', 'Lemma Supply']
    }
];

const categories = ['Todos', 'Extratos vegetais', 'Compostos bioativos'];

const AtivosPage = () => {
    const [selectedCategory, setSelectedCategory] = useState('Todos');

    const filteredActives = selectedCategory === 'Todos'
        ? activesList
        : activesList.filter(a => a.category === selectedCategory);

    const handleOrderActive = (activeName) => {
        const msg = `Olá! Vi a matéria-prima *${activeName}* no site da Graphène e gostaria de consultar informações técnicas e disponibilidade.`;
        window.open(getWhatsAppUrl(msg), '_blank');
    };

    return (
        <div className="page-root">
            <Header />
            <main>
                {/* Hero da Página de Ativos */}
                <section className="page-hero">
                    <div className="container">
                        <div className="store-badge">
                            <Award size={14} />
                            <span>Informações sobre matérias-primas</span>
                        </div>
                        <h1>Matérias-primas e <span className="highlight-blue">fornecedores</span></h1>
                        <p>
                            Conheça alguns ingredientes e fornecedores apresentados pela Graphène. A escolha de uma matéria-prima para uma fórmula individualizada depende da prescrição, da avaliação farmacêutica e dos requisitos aplicáveis.
                        </p>
                    </div>
                </section>

                {/* Banner de Garantia de Selo */}
                <section className="store-section" style={{ paddingTop: 0, paddingBottom: '28px' }}>
                    <div className="container">
                        <div className="store-card authenticity-guarantee-card">
                            <div className="guarantee-icon">
                                <ShieldCheck size={32} color="var(--brand-green)" />
                            </div>
                            <div className="guarantee-text">
                                    <h3>Informações para uma escolha consciente</h3>
                                <p>
                                    Marcas e nomes de ingredientes não substituem orientação profissional. Nossa equipe pode esclarecer composição, procedência e documentação disponível antes de preparar um orçamento.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Filtro por Categoria com rolagem suave no mobile */}
                <section className="store-section" style={{ paddingTop: 0 }}>
                    <div className="container">
                        <div className="filter-bar-wrapper">
                            <div className="filter-bar">
                                {categories.map((cat) => (
                                    <button
                                        key={cat}
                                        className={`filter-pill ${selectedCategory === cat ? 'filter-pill--active' : ''}`}
                                        onClick={() => setSelectedCategory(cat)}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Grid de Ativos */}
                        <div className="actives-grid">
                            {filteredActives.map((active) => (
                                <div key={active.id} className="store-card active-card">
                                    <div className="active-card-top">
                                        <div className="active-seal-box" aria-hidden="true">
                                            <Sparkles size={28} color="var(--brand-blue)" />
                                        </div>
                                        <div className="active-header-info">
                                            <span className="active-lab-tag">{active.lab}</span>
                                            <h2 className="active-title">{active.name}</h2>
                                            <span className="active-cat-badge">{active.category}</span>
                                        </div>
                                    </div>

                                    <div className="active-card-body">
                                        <h4>{active.headline}</h4>
                                        <p>{active.description}</p>

                                        <div className="active-tags-row">
                                            {active.tags.map((t, idx) => (
                                                <span key={idx} className="active-mini-tag">
                                                    <CheckCircle2 size={11} color="var(--brand-blue)" /> {t}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="active-card-actions">
                                        <button
                                            onClick={() => handleOrderActive(active.name)}
                                            className="btn-buy-wa"
                                            style={{ width: '100%' }}
                                        >
                                            <MessageCircle size={16} />
                                            <span>Consultar sobre {active.name}</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* CTA para Prescritores */}
                        <div className="store-card active-cta-box">
                            <div className="cta-box-left">
                                <Sparkles size={26} color="var(--brand-blue)" />
                                <div>
                                    <h3>É médico, nutricionista ou profissional de saúde?</h3>
                                    <p>Fale com a equipe farmacêutica sobre informações técnicas e atendimento a profissionais habilitados.</p>
                                </div>
                            </div>
                            <div className="cta-box-btns">
                                <Link to="/prescritores" className="btn-cta-blue">
                                    <span>Canal para profissionais</span>
                                    <ArrowRight size={16} />
                                </Link>
                                <Link to="/receita" className="btn-cta-outline">
                                    <FileUp size={16} />
                                    <span>Solicitar orçamento</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
            <FloatingWhatsApp />

            <style>{`
                .page-hero { padding: 48px 0 28px; text-align: center; }
                .page-hero h1 { font-size: clamp(1.85rem, 3.5vw, 2.6rem); font-weight: 800; margin: 10px 0; }
                .page-hero p { font-size: 1rem; color: var(--text-dim); max-width: 720px; margin: 0 auto; }

                .authenticity-guarantee-card {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    padding: 24px 28px;
                    background: linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(0,180,216,0.05) 100%);
                    border: 1px solid rgba(16,185,129,0.25);
                }

                .guarantee-icon {
                    width: 56px;
                    height: 56px;
                    border-radius: var(--radius-sm);
                    background: rgba(16,185,129,0.12);
                    border: 1px solid rgba(16,185,129,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .guarantee-text h3 {
                    font-size: 1.1rem;
                    font-weight: 800;
                    margin-bottom: 4px;
                    color: #fff;
                }

                .guarantee-text p {
                    font-size: 0.86rem;
                    color: var(--text-dim);
                    margin: 0;
                    line-height: 1.55;
                }

                .filter-bar-wrapper {
                    width: 100%;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: none;
                    margin-bottom: 32px;
                }
                .filter-bar-wrapper::-webkit-scrollbar { display: none; }

                .filter-bar {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 8px;
                    min-width: min-content;
                }

                .filter-pill {
                    background: rgba(255,255,255,0.04);
                    border: 1px solid var(--border-subtle);
                    color: var(--text-dim);
                    padding: 8px 18px;
                    border-radius: var(--radius-full);
                    font-size: 0.84rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: var(--transition);
                    white-space: nowrap;
                }
                .filter-pill:hover { border-color: var(--brand-blue); color: #fff; }
                .filter-pill--active {
                    background: var(--brand-blue);
                    border-color: var(--brand-blue);
                    color: #07090e !important;
                    font-weight: 700;
                }

                .actives-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 24px;
                    margin-bottom: 40px;
                }

                .active-card {
                    display: flex;
                    flex-direction: column;
                    padding: 24px;
                    overflow: hidden;
                }

                .active-card-top {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    margin-bottom: 16px;
                }

                .active-seal-box {
                    width: 60px;
                    height: 60px;
                    border-radius: var(--radius-sm);
                    background: rgba(255,255,255,0.03);
                    border: 1px solid var(--border-subtle);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 4px;
                    flex-shrink: 0;
                }

                .active-seal-img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }

                .active-header-info {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .active-lab-tag {
                    font-size: 0.7rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    color: var(--brand-blue);
                    letter-spacing: 0.04em;
                }

                .active-title {
                    font-size: 1.3rem;
                    font-weight: 800;
                    margin: 0;
                }

                .active-cat-badge {
                    font-size: 0.72rem;
                    color: var(--text-muted);
                }

                .active-banner-preview {
                    width: 100%;
                    height: 180px;
                    border-radius: var(--radius-sm);
                    overflow: hidden;
                    margin-bottom: 14px;
                    border: 1px solid var(--border-subtle);
                    background: rgba(0, 0, 0, 0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 6px;
                }

                .active-banner-preview img {
                    max-width: 100%;
                    max-height: 100%;
                    width: auto;
                    height: auto;
                    object-fit: contain;
                    display: block;
                }

                .active-card-body {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    margin-bottom: 18px;
                }

                .active-card-body h4 {
                    font-size: 0.92rem;
                    font-weight: 700;
                    color: #fff;
                    line-height: 1.4;
                }

                .active-card-body p {
                    font-size: 0.84rem;
                    color: var(--text-dim);
                    line-height: 1.55;
                    margin: 0;
                }

                .active-tags-row {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    margin-top: 4px;
                }

                .active-mini-tag {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    padding: 3px 8px;
                    border-radius: var(--radius-xs);
                    background: rgba(255,255,255,0.03);
                    border: 1px solid var(--border-subtle);
                    color: var(--text-dim);
                }

                .active-card-actions {
                    margin-top: auto;
                    padding-top: 14px;
                    border-top: 1px solid var(--border-subtle);
                }

                .active-cta-box {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 24px;
                    padding: 30px;
                }

                .cta-box-left {
                    display: flex;
                    align-items: flex-start;
                    gap: 16px;
                    max-width: 580px;
                }

                .cta-box-left h3 {
                    font-size: 1.1rem;
                    margin-bottom: 4px;
                }

                .cta-box-left p {
                    font-size: 0.86rem;
                    margin: 0;
                }

                .cta-box-btns {
                    display: flex;
                    gap: 10px;
                    flex-shrink: 0;
                }

                @media (max-width: 960px) {
                    .actives-grid { grid-template-columns: 1fr; }
                    .filter-bar { flex-wrap: nowrap; justify-content: flex-start; padding: 0 4px; }
                    .authenticity-guarantee-card { flex-direction: column; text-align: center; }
                    .active-cta-box { flex-direction: column; text-align: center; padding: 22px 18px; }
                    .cta-box-left { flex-direction: column; align-items: center; }
                    .cta-box-btns { width: 100%; flex-direction: column; }
                    .cta-box-btns a { width: 100%; justify-content: center; }
                }

                @media (max-width: 600px) {
                    .active-card { padding: 18px 14px; }
                    .active-banner-preview { height: 160px; }
                }
            `}</style>
        </div>
    );
};

export default AtivosPage;
