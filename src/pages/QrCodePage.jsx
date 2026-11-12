import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { ArrowRight, FileText, Instagram, Loader2, MapPin, MessageCircle, RotateCcw, ShoppingBag } from 'lucide-react';
import { getWhatsAppUrl } from '../config';
import { business } from '../data/business';
import { PRESCRIPTION_PAGES_ENABLED } from '../data/publicChannels';
import { buscarCodigo, codigoValido, normalizarCodigo } from '../lib/qrCodesApi';
import { productPhoto, restoreOriginalImage } from '../utils/productImages';

// Página única do QR code dos rótulos (/qrcode). Todos os rótulos usam o mesmo QR; o código do produto
// fica impresso embaixo dele. "Pedir de novo" pede esse código e leva ao produto da loja ou ao WhatsApp.
// Também aceita /qrcode?codigo=HFC01 (mesma página), para quando o código vier no endereço.

const MENSAGEM_GERAL = 'Olá! Vim pelo QR code do rótulo e quero falar com o farmacêutico.';

// Consulta o código e devolve o próximo estado da tela (falha de rede vira "pedir pelo WhatsApp").
async function resolverCodigo(limpo) {
    try {
        const achado = await buscarCodigo(limpo);
        return achado ? { tipo: 'achado', ...achado } : { tipo: 'nao-achado', codigo: limpo };
    } catch {
        toast.error('Não conseguimos consultar o código agora. Você pode pedir pelo WhatsApp.');
        return { tipo: 'nao-achado', codigo: limpo };
    }
}

export default function QrCodePage() {
    const [params] = useSearchParams();
    const doEndereco = normalizarCodigo(params.get('codigo'));
    const [codigo, setCodigo] = useState(doEndereco);
    const [estado, setEstado] = useState(() => (codigoValido(doEndereco) ? { tipo: 'buscando' } : { tipo: 'vazio' }));

    useEffect(() => {
        if (!codigoValido(doEndereco)) return undefined;
        let ativo = true;
        resolverCodigo(doEndereco).then(novo => { if (ativo) setEstado(novo); });
        return () => { ativo = false; };
    }, [doEndereco]);

    const consultar = async valor => {
        const limpo = normalizarCodigo(valor);
        setCodigo(limpo);
        if (!codigoValido(limpo)) {
            setEstado({ tipo: 'invalido' });
            return;
        }
        setEstado({ tipo: 'buscando' });
        setEstado(await resolverCodigo(limpo));
    };

    const abrirPedido = () => {
        document.getElementById('qr-pedido')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        document.getElementById('qr-codigo')?.focus({ preventScroll: true });
    };

    const links = [
        { href: getWhatsAppUrl(MENSAGEM_GERAL), icone: MessageCircle, titulo: 'Falar com o farmacêutico', texto: 'Tire dúvidas pelo WhatsApp', externo: true, destaque: true },
        { onClick: abrirPedido, icone: RotateCcw, titulo: 'Pedir de novo', texto: 'Use o código embaixo do QR code' },
        { to: '/produtos', icone: ShoppingBag, titulo: 'Ver todos os produtos', texto: 'Loja com entrega em todo o Brasil' },
        PRESCRIPTION_PAGES_ENABLED && { to: '/receita', icone: FileText, titulo: 'Enviar receita', texto: 'Foto ou PDF, com orçamento' },
        { href: business.instagram, icone: Instagram, titulo: 'Instagram', texto: '@graphene_manipulacoes', externo: true },
        { to: '/sobre', icone: MapPin, titulo: 'Endereço e horário', texto: 'Rua Itajuru, 300 · Cabo Frio, RJ' },
    ].filter(Boolean);

    return (
        <div className="qr-page">
            <Toaster position="top-center" richColors />
            <main className="qr-wrap">
                <header className="qr-head">
                    <Link to="/" aria-label="Ir para o site da Graphène">
                        <img src="/assets/brand/graphene-logo.webp" alt="Graphène Manipulações" width="180" height="73" />
                    </Link>
                    <h1>Olá! Como podemos ajudar?</h1>
                    <p>Escolha uma opção abaixo. Para repetir um pedido, use o código que fica embaixo do QR code, no rótulo.</p>
                </header>

                <section className="qr-pedido" id="qr-pedido" aria-labelledby="qr-pedido-titulo">
                    <h2 id="qr-pedido-titulo"><RotateCcw size={18} aria-hidden="true" /> Pedir de novo</h2>
                    <form onSubmit={evento => { evento.preventDefault(); consultar(codigo); }}>
                        <label htmlFor="qr-codigo">Código do produto</label>
                        <div className="qr-campo">
                            <input
                                id="qr-codigo"
                                value={codigo}
                                onChange={evento => setCodigo(evento.target.value.toUpperCase())}
                                placeholder="Ex.: HFC01"
                                autoComplete="off"
                                autoCapitalize="characters"
                                spellCheck="false"
                                maxLength={20}
                                inputMode="text"
                            />
                            <button type="submit" disabled={estado.tipo === 'buscando'}>
                                {estado.tipo === 'buscando' ? <Loader2 size={18} className="qr-gira" aria-hidden="true" /> : 'Continuar'}
                            </button>
                        </div>
                        <small>Está impresso embaixo do QR code, no rótulo do seu produto.</small>
                    </form>
                    <div aria-live="polite">
                        <Resultado estado={estado} />
                    </div>
                </section>

                <nav className="qr-links" aria-label="Opções">
                    {links.map(({ icone, titulo, texto, destaque, ...destino }) => {
                        const Icone = icone;
                        const conteudo = (
                            <>
                                <span className="qr-link-icone"><Icone size={20} aria-hidden="true" /></span>
                                <span className="qr-link-texto"><strong>{titulo}</strong><span>{texto}</span></span>
                                <ArrowRight size={18} aria-hidden="true" className="qr-link-seta" />
                            </>
                        );
                        const classe = `qr-link${destaque ? ' qr-link--destaque' : ''}`;
                        if (destino.onClick) return <button key={titulo} type="button" className={classe} onClick={destino.onClick}>{conteudo}</button>;
                        if (destino.to) return <Link key={titulo} className={classe} to={destino.to}>{conteudo}</Link>;
                        return <a key={titulo} className={classe} href={destino.href} target="_blank" rel="noopener noreferrer">{conteudo}</a>;
                    })}
                </nav>

                <footer className="qr-rodape">
                    <p>{business.name} · CNPJ {business.cnpj}</p>
                    <p>Farmácia de manipulação · Entrega em todo o Brasil</p>
                </footer>
            </main>
            <style>{estilos}</style>
        </div>
    );
}

function Resultado({ estado }) {
    if (estado.tipo === 'invalido') {
        return <p className="qr-aviso">Digite o código como está no rótulo, só com letras e números (ex.: HFC01).</p>;
    }
    if (estado.tipo === 'nao-achado') {
        return (
            <div className="qr-resultado">
                <p className="qr-aviso">Não encontramos o código <strong>{estado.codigo}</strong>. Confira no rótulo ou peça pelo WhatsApp que a equipe ajuda.</p>
                <a className="qr-botao qr-botao--wa" href={getWhatsAppUrl(`Olá! Quero pedir de novo um produto. O código no rótulo é ${estado.codigo}.`)} target="_blank" rel="noopener noreferrer">
                    <MessageCircle size={18} aria-hidden="true" /> Pedir pelo WhatsApp
                </a>
            </div>
        );
    }
    if (estado.tipo !== 'achado') return null;
    const { codigo, nome, produto } = estado;
    return (
        <div className="qr-resultado qr-resultado--achado">
            <div className="qr-produto">
                {produto && <img src={productPhoto(produto)} alt="" onError={restoreOriginalImage} />}
                <div>
                    <span className="qr-produto-codigo">Código {codigo}</span>
                    <strong>{nome}</strong>
                </div>
            </div>
            <div className="qr-botoes">
                {produto && (
                    <Link className="qr-botao" to={`/produto/${produto.id}`}>
                        <ShoppingBag size={18} aria-hidden="true" /> Ver na loja
                    </Link>
                )}
                <a className={`qr-botao qr-botao--wa${produto ? ' qr-botao--secundario' : ''}`} href={getWhatsAppUrl(`Olá! Quero pedir de novo: ${nome} (código ${codigo}).`)} target="_blank" rel="noopener noreferrer">
                    <MessageCircle size={18} aria-hidden="true" /> Pedir pelo WhatsApp
                </a>
            </div>
        </div>
    );
}

const estilos = `
    .qr-page { min-height: 100vh; background: radial-gradient(120% 60% at 50% 0%, #10213a 0%, var(--bg-store, #070a10) 62%); color: var(--text-main, #f8fafc); display: flex; justify-content: center; padding: 28px 16px 40px; }
    .qr-wrap { width: 100%; max-width: 460px; display: flex; flex-direction: column; gap: 18px; }
    .qr-head { text-align: center; }
    .qr-head img { width: 150px; height: auto; margin: 4px auto 14px; display: block; }
    .qr-head h1 { font-size: 1.55rem; line-height: 1.2; margin: 0 0 8px; letter-spacing: -.02em; }
    .qr-head p { color: var(--text-dim, #c7d3df); font-size: .95rem; line-height: 1.55; margin: 0; }
    .qr-pedido { background: var(--bg-card, #121a27); border: 1px solid rgba(64, 204, 229, .28); border-radius: 18px; padding: 18px; }
    .qr-pedido h2 { display: flex; align-items: center; gap: 8px; font-size: 1.08rem; margin: 0 0 12px; color: var(--brand-blue-light, #67dcf3); }
    .qr-pedido label { display: block; font-size: .85rem; font-weight: 700; margin-bottom: 7px; }
    .qr-campo { display: flex; gap: 8px; }
    .qr-campo input { flex: 1; min-width: 0; height: 50px; border-radius: 12px; border: 1px solid rgba(148, 163, 184, .35); background: #0b111b; color: var(--text-main, #f8fafc); font-size: 1.15rem; font-weight: 700; letter-spacing: .12em; padding: 0 14px; text-transform: uppercase; }
    .qr-campo input::placeholder { color: #64748b; letter-spacing: .04em; font-weight: 500; }
    .qr-campo input:focus { outline: 2px solid var(--brand-blue, #22c7e8); outline-offset: 1px; }
    .qr-campo button { height: 50px; padding: 0 18px; border-radius: 12px; border: 0; background: var(--brand-blue, #22c7e8); color: #04121a; font-weight: 800; font-size: .98rem; cursor: pointer; min-width: 112px; display: inline-flex; align-items: center; justify-content: center; }
    .qr-campo button:disabled { opacity: .7; cursor: wait; }
    .qr-pedido small { display: block; color: var(--text-muted, #94a3b8); font-size: .8rem; margin-top: 8px; }
    .qr-gira { animation: qr-gira 1s linear infinite; }
    @keyframes qr-gira { to { transform: rotate(360deg); } }
    .qr-resultado { margin-top: 14px; display: flex; flex-direction: column; gap: 12px; }
    .qr-aviso { margin: 0; color: #fcd9a8; background: rgba(245, 158, 11, .1); border: 1px solid rgba(245, 158, 11, .28); border-radius: 12px; padding: 11px 13px; font-size: .9rem; line-height: 1.5; }
    .qr-produto { display: flex; align-items: center; gap: 12px; background: #0b111b; border-radius: 14px; padding: 12px; border: 1px solid rgba(148, 163, 184, .2); }
    .qr-produto img { width: 64px; height: 64px; object-fit: contain; border-radius: 10px; background: #fff; flex: 0 0 auto; }
    .qr-produto strong { display: block; font-size: 1.05rem; line-height: 1.3; }
    .qr-produto-codigo { display: block; color: var(--text-muted, #94a3b8); font-size: .75rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 3px; }
    .qr-botoes { display: flex; flex-direction: column; gap: 8px; }
    .qr-botao { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 50px; border-radius: 12px; background: var(--brand-blue, #22c7e8); color: #04121a; font-weight: 800; text-decoration: none; font-size: 1rem; }
    .qr-botao--wa { background: var(--brand-green); color: var(--action-ink); }
    .qr-botao--wa:hover { background: var(--brand-green-hover); color: var(--action-ink); }
    .qr-botao--secundario { background: transparent; color: var(--brand-green); border: 1px solid rgba(36, 211, 154, .55); }
    .qr-botao--secundario:hover { background: rgba(36, 211, 154, .12); color: var(--brand-green); }
    .qr-links { display: flex; flex-direction: column; gap: 10px; }
    .qr-link { display: flex; align-items: center; gap: 13px; width: 100%; text-align: left; padding: 14px 15px; border-radius: 16px; background: var(--bg-card, #121a27); border: 1px solid rgba(148, 163, 184, .18); color: var(--text-main, #f8fafc); text-decoration: none; font: inherit; cursor: pointer; transition: border-color .2s ease, transform .2s ease; }
    .qr-link:hover { border-color: rgba(64, 204, 229, .5); transform: translateY(-1px); }
    .qr-link--destaque { background: rgba(36, 211, 154, .1); border-color: rgba(36, 211, 154, .5); }
    .qr-link-icone { width: 42px; height: 42px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; background: rgba(64, 204, 229, .12); color: var(--brand-blue-light, #67dcf3); flex: 0 0 auto; }
    .qr-link--destaque .qr-link-icone { background: var(--brand-green); color: var(--action-ink); }
    .qr-link-texto { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
    .qr-link-texto strong { font-size: 1rem; }
    .qr-link-texto span { color: var(--text-dim, #c7d3df); font-size: .84rem; }
    .qr-link-seta { color: var(--text-muted, #94a3b8); flex: 0 0 auto; }
    .qr-rodape { text-align: center; color: var(--text-muted, #94a3b8); font-size: .76rem; line-height: 1.6; margin-top: 4px; }
    .qr-rodape p { margin: 0; }
    @media (prefers-reduced-motion: reduce) { .qr-link { transition: none; } }
`;
