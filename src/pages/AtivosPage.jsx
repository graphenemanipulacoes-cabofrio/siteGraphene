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
        category: 'Saúde Feminina',
        headline: 'O 1º Nutracêutico para Todas as Etapas do Climatério e Menopausa',
        description: 'Destaque no Fantástico (TV Globo). Modulação hormonal natural para alívio de fogachos, melhora do sono, disposição e proteção cardiovascular feminina.',
        seal_img: '/assets/ativos/0 (9).jpeg',
        banner_img: '/assets/ativos/0 (15).jpeg',
        tags: ['Climatério', 'Menopausa', 'TV Globo / Fantástico', 'Bioativos Naturais']
    },
    {
        id: 'terasen',
        name: 'Terasen®',
        lab: 'Ages Bioactive Compounds',
        category: 'Dermatologia & Longevidade',
        headline: 'Nutricosmético Oral Avançado para Longevidade da Pele e Melasma',
        description: 'Bioativos nobres do bioma amazônico que combatem a senescência celular da pele, clareiam manchas de melasma de dentro para fora e protegem o colágeno.',
        seal_img: '/assets/ativos/0 (14).jpeg',
        banner_img: '/assets/ativos/0 (18).jpeg',
        tags: ['Anti-Melasma', 'Skin Longevity', 'Bioativos Amazônicos', 'Colágeno']
    },
    {
        id: 'chronic',
        name: 'Chronic®',
        lab: 'Ages Bioactive Compounds',
        category: 'Articulações & Mobilidade',
        headline: 'Inteligência Bioativa para Músculos, Ossos e Articulações',
        description: 'Extrato vegetal padronizado de Bixa orellana rico em geranilgeraniol e tocotrienóis. Fortalecimento músculo-esquelético, alívio de dores articulares e prevenção da sarcopenia.',
        seal_img: '/assets/ativos/0 (7).jpeg',
        banner_img: '/assets/ativos/0 (16).jpeg',
        tags: ['Mobilidade', 'Dores Articulares', 'Ossos & Músculos', 'Anti-inflamatório']
    },
    {
        id: 'glisodin',
        name: 'GliSODin®',
        lab: 'Lemma Supply',
        category: 'Antioxidante & Longevidade',
        headline: 'A Primeira Superóxido Dismutase (SOD) Oralmente Eficaz do Mundo',
        description: 'Tecnologia patenteada francesa extraída do melão cantaloupe unida à gliadina. Potente neutralizador de radicais livres, proteção celular, imunidade e fotoenvelhecimento.',
        seal_img: '/assets/ativos/0 (2).jpeg',
        banner_img: '/assets/ativos/0 (1).jpeg',
        tags: ['SOD Oral', 'Patente Francesa', 'Anti-Aging Celular', 'Imunomodulador']
    },
    {
        id: 'mitburn',
        name: 'Mitburn®',
        lab: 'Biodiversité',
        category: 'Metabolismo & Emagrecimento',
        headline: 'Biogênese Mitocondrial e Queima de Gordura Visceral',
        description: 'Ativo 100% natural obtido a partir de oliveiras orgânicas da França. Estimula o receptor TGR5, aumentando o gasto energético celular e reduzindo a gordura abdominal.',
        seal_img: '/assets/ativos/0 (5).jpeg',
        banner_img: null,
        tags: ['Gordura Abdominal', 'Biogênese Mitocondrial', 'Gasto Calórico', '100% Original']
    },
    {
        id: 'zembrin',
        name: 'Zembrin®',
        lab: 'O Legítimo • Lemma',
        category: 'Mente & Foco',
        headline: 'Fitoterápico Padronizado para Alívio Rápido de Ansiedade e Estresse',
        description: 'Extrato botânico de Sceletium tortuosum clinicamente comprovado para diminuir os níveis de cortisol, melhorar o humor e aumentar a clareza mental e o foco.',
        seal_img: '/assets/ativos/0 (3).jpeg',
        banner_img: null,
        tags: ['Anti-Estresse', 'Foco & Humor', 'Controle de Cortisol', 'Clínico']
    },
    {
        id: 'exsynutriment',
        name: 'Exsynutriment®',
        lab: 'AQIA • Biotec',
        category: 'Dermatologia & Longevidade',
        headline: 'A Autêntica Pílula da Beleza: Silício Orgânico Hidrossolúvel',
        description: 'Molécula patenteada essencial para a síntese biológica de colágeno, elastina e queratina. Firmeza facial, fortalecimento capilar e endurecimento de unhas frágeis.',
        seal_img: '/assets/ativos/0 (11).jpeg',
        banner_img: null,
        tags: ['Pílula da Beleza', 'Silício Orgânico', 'Cabelo e Unhas', 'Firmeza']
    },
    {
        id: 'drenow-c',
        name: 'Drenow C®',
        lab: 'Florien',
        category: 'Metabolismo & Emagrecimento',
        headline: 'Drenagem Linfática em Cápsulas com Dupla Ação Antioxidante',
        description: 'Composto fitoativo rico em vitamina C natural e bioflavonoides que reduz significativamente o inchaço corporal, celulite e a retenção de líquidos sem perda de minerais.',
        seal_img: '/assets/ativos/0 (8).jpeg',
        banner_img: null,
        tags: ['Drenagem Oral', 'Anti-Inchaço', 'Celulite', 'Florien Original']
    },
    {
        id: 'akkermat',
        name: 'Akkermat®',
        lab: 'Florien',
        category: 'Metabolismo & Emagrecimento',
        headline: 'Controle de Apetite por Estímulo da Bactéria Magra Akkermansia',
        description: 'Fitoativo em beadlets com tecnologia patenteada que estimula o GLP-1 natural, induz saciedade prolongada e atua na microbiota intestinal contra a compulsão alimentar.',
        seal_img: '/assets/ativos/0 (13).jpeg',
        banner_img: null,
        tags: ['Saciedade', 'Estímulo GLP-1', 'Beadlets Florien', 'Compulsão']
    },
    {
        id: 'bio-arct',
        name: 'Bio-Arct®',
        lab: 'AQIA • Biotec',
        category: 'Antioxidante & Longevidade',
        headline: 'Biomassa Polar Rica em Dipeptídeos para Energia e Detox Mitocondrial',
        description: 'Nutracêutico extraído do Mar Ártico com ação energizante mitocondrial, neutralização de toxinas e estímulo à produção de óxido nítrico.',
        seal_img: '/assets/ativos/0 (22).jpeg',
        banner_img: null,
        tags: ['Bioenergia', 'Detox Polar', 'Mar Ártico', 'Biotec']
    },
    {
        id: 'glycoxil',
        name: 'Glycoxil®',
        lab: 'AQIA • Biotec',
        category: 'Dermatologia & Longevidade',
        headline: 'O Mais Potente Antiglicante Oral: Proteção Anti-Açúcar',
        description: 'Patente que previne e reverte a glicação (envelhecimento das proteínas pelo excesso de açúcar), protegendo vasos, órgãos e a juventude da pele.',
        seal_img: '/assets/ativos/0 (20).jpeg',
        banner_img: null,
        tags: ['Anti-Glicação', 'Proteção Celular', 'Anti-Rugas', 'Biotec']
    },
    {
        id: 'phytgen',
        name: 'PhyTgen®',
        lab: 'Lemma Supply',
        category: 'Metabolismo & Emagrecimento',
        headline: 'Associação Potente de Fucoxantina e Óleo de Romã',
        description: 'Gasto calórico de até 400 kcal por dia, aceleração do metabolismo basal e redução da gordura no fígado (esteatose hepática).',
        seal_img: '/assets/ativos/0 (4).jpeg',
        banner_img: null,
        tags: ['Queima 400kcal', 'Fucoxantina', 'Fígado Saudável', 'Lemma']
    }
];

const categories = ['Todos', 'Saúde Feminina', 'Dermatologia & Longevidade', 'Metabolismo & Emagrecimento', 'Mente & Foco', 'Articulações & Mobilidade'];

const AtivosPage = () => {
    const [selectedCategory, setSelectedCategory] = useState('Todos');

    const filteredActives = selectedCategory === 'Todos'
        ? activesList
        : activesList.filter(a => a.category === selectedCategory);

    const handleOrderActive = (activeName) => {
        const msg = `Olá! Vi o ativo patenteado *${activeName}* no site da Graphène e gostaria de solicitar uma cotação/fórmula manipulada.`;
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
                            <span>Matérias-Primas Originais • Grau Ouro</span>
                        </div>
                        <h1>Ativos Patenteados & <span className="highlight-blue">Selos de Autenticidade</span></h1>
                        <p>
                            Na Graphène, cada fórmula é manipulada exclusivamente com as matérias-primas originais certificadas pelos maiores centros de biotecnologia do mundo (Ages, Lemma Supply, Biotec, Florien).
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
                                <h3>Seu pote sai do nosso laboratório com o Selo Oficial de Procedência</h3>
                                <p>
                                    Recuse cópias genéricas. Quando você manipula Ormona®, Terasen®, GliSODin®, Zembrin® ou Mitburn® na Graphène, você recebe a matéria-prima legítima respaldada por estudos clínicos publicados e dosagem 100% garantida por pesagem computadorizada.
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
                                        <div className="active-seal-box">
                                            <img
                                                src={active.seal_img}
                                                alt={`Selo Oficial ${active.name}`}
                                                className="active-seal-img"
                                            />
                                        </div>
                                        <div className="active-header-info">
                                            <span className="active-lab-tag">{active.lab}</span>
                                            <h2 className="active-title">{active.name}</h2>
                                            <span className="active-cat-badge">{active.category}</span>
                                        </div>
                                    </div>

                                    {/* Imagem do Ativo */}
                                    {active.banner_img && (
                                        <div className="active-banner-preview">
                                            <img src={active.banner_img} alt={active.name} />
                                        </div>
                                    )}

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
                                            <span>Cotar Fórmula com {active.name}</span>
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
                                    <p>Consulte nosso compêndio técnico com literatura científica completa e veículos farmacêuticos exclusivos para prescrição.</p>
                                </div>
                            </div>
                            <div className="cta-box-btns">
                                <Link to="/prescritores" className="btn-cta-blue">
                                    <span>Portal Prescritores</span>
                                    <ArrowRight size={16} />
                                </Link>
                                <Link to="/receita" className="btn-cta-outline">
                                    <FileUp size={16} />
                                    <span>Enviar Receita</span>
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
