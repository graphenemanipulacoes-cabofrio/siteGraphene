import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Download, FileText, ImageOff, LoaderCircle, Maximize2, Minus, Paperclip, Plus, RefreshCw, RotateCw, X } from 'lucide-react';
import { closePdf, openPdf, renderPdfPage } from '../lib/pdfPreview';
import { attachmentFileName, isPdfFile } from '../utils/prescriptionFiles';
import '../styles/prescription-files.css';

// Os links dos anexos valem 5 minutos: antes de abrir ou baixar, pede links novos se já passou de 4.
const LINK_REFRESH_MS = 4 * 60 * 1000;
const THUMB_WIDTH = 280;
const COMPACT_LIMIT = 3;
const MAX_PDF_PAGES = 20;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;
const clampZoom = value => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

function PdfThumb({ url }) {
    const canvasRef = useRef(null);
    const [status, setStatus] = useState('loading');
    useEffect(() => {
        let active = true;
        let doc = null;
        (async () => {
            try {
                doc = await openPdf(url);
                if (!active) return;
                const page = await doc.getPage(1);
                if (!active) return;
                await renderPdfPage(page, canvasRef.current, { width: THUMB_WIDTH }).promise;
                if (active) setStatus('ready');
            } catch {
                if (active) setStatus('error');
            }
        })();
        return () => { active = false; closePdf(doc); };
    }, [url]);
    return <>
        <canvas ref={canvasRef} className="prescription-thumb-media" hidden={status !== 'ready'} aria-hidden="true" />
        {status === 'loading' && <LoaderCircle className="prescription-spin" size={22} aria-hidden="true" />}
        {status === 'error' && <FileText size={28} aria-hidden="true" />}
    </>;
}

function ImageThumb({ url, alt }) {
    const [failed, setFailed] = useState(false);
    if (failed) return <ImageOff size={26} aria-hidden="true" />;
    return <img className="prescription-thumb-media" src={url} alt={alt} loading="lazy" decoding="async" draggable={false} onError={() => setFailed(true)} />;
}

function ImagePage({ file, alt, zoom, rotation, stage, onError }) {
    const [natural, setNatural] = useState(null);
    const turned = rotation % 180 !== 0;
    const boxWidth = natural ? (turned ? natural.height : natural.width) : 0;
    const boxHeight = natural ? (turned ? natural.width : natural.height) : 0;
    const fit = natural && stage.width && stage.height ? Math.min(stage.width / boxWidth, stage.height / boxHeight) : 0;
    const ready = fit > 0;
    return <div className="prescription-viewer-page" style={ready ? { width: boxWidth * fit * zoom, height: boxHeight * fit * zoom } : undefined}>
        {!ready && <LoaderCircle className="prescription-spin" size={34} aria-hidden="true" />}
        <img
            src={file.url}
            alt={alt}
            draggable={false}
            hidden={!ready}
            style={ready ? { width: natural.width * fit * zoom, height: natural.height * fit * zoom, transform: `translate(-50%, -50%) rotate(${rotation}deg)` } : undefined}
            onLoad={event => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
            onError={onError}
        />
    </div>;
}

function PdfPages({ file, zoom, rotation, stage, onError }) {
    const canvases = useRef([]);
    const [doc, setDoc] = useState(null);
    const [truncated, setTruncated] = useState(false);
    useEffect(() => {
        let active = true;
        let opened = null;
        openPdf(file.url).then(result => {
            opened = result;
            if (!active) { closePdf(result); return; }
            setDoc(result);
            setTruncated(result.numPages > MAX_PDF_PAGES);
        }).catch(() => { if (active) onError(); });
        return () => { active = false; closePdf(opened); };
    }, [file.url, onError]);
    const pageCount = doc ? Math.min(doc.numPages, MAX_PDF_PAGES) : 0;
    useEffect(() => {
        if (!doc) return undefined;
        let active = true;
        let task = null;
        (async () => {
            try {
                for (let number = 1; number <= pageCount && active; number++) {
                    const page = await doc.getPage(number);
                    if (!active || !canvases.current[number - 1]) return;
                    task = renderPdfPage(page, canvases.current[number - 1], { width: 1800, rotation });
                    await task.promise;
                }
            } catch {
                if (active) onError();
            }
        })();
        return () => { active = false; task?.cancel(); };
    }, [doc, pageCount, rotation, onError]);
    const width = Math.min(stage.width || 0, 1000) * zoom;
    if (!doc) return <div className="prescription-viewer-page"><LoaderCircle className="prescription-spin" size={34} aria-hidden="true" /></div>;
    return <div className="prescription-viewer-pdf" style={{ width }}>
        {Array.from({ length: pageCount }, (_, index) => <canvas key={index} ref={node => { canvases.current[index] = node; }} aria-label={`Página ${index + 1} de ${doc.numPages}`} role="img" />)}
        {truncated && <p>Mostrando as {MAX_PDF_PAGES} primeiras páginas de {doc.numPages}. Baixe o arquivo para ver todas.</p>}
    </div>;
}

function PrescriptionViewer({ files, startIndex, clientName, getFreshFiles, onClose }) {
    const [index, setIndex] = useState(startIndex);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [problem, setProblem] = useState('');
    const [downloading, setDownloading] = useState(false);
    const [stage, setStage] = useState({ width: 0, height: 0 });
    const stageRef = useRef(null);
    const closeRef = useRef(null);
    const drag = useRef(null);
    const file = files[index];
    const isPdf = isPdfFile(file);
    const position = files.length > 1 ? `Anexo ${index + 1} de ${files.length}` : 'Anexo';

    const goTo = useCallback(next => {
        setIndex(current => (current + next + files.length) % files.length);
        setZoom(1); setRotation(0); setProblem('');
    }, [files.length]);
    const showLoadProblem = useCallback(() => setProblem('Não foi possível abrir este anexo. Feche e abra de novo.'), []);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        const previousFocus = document.activeElement;
        document.body.style.overflow = 'hidden';
        closeRef.current?.focus();
        return () => { document.body.style.overflow = previousOverflow; previousFocus?.focus?.(); };
    }, []);

    useEffect(() => {
        const onKey = event => {
            if (event.key === 'Escape') onClose();
            else if (event.key === 'ArrowRight' && files.length > 1) goTo(1);
            else if (event.key === 'ArrowLeft' && files.length > 1) goTo(-1);
            else if (event.key === '+' || event.key === '=') setZoom(value => clampZoom(value + 0.25));
            else if (event.key === '-') setZoom(value => clampZoom(value - 0.25));
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [files.length, goTo, onClose]);

    useEffect(() => {
        const node = stageRef.current;
        if (!node) return undefined;
        const observer = new ResizeObserver(() => setStage({ width: node.clientWidth, height: node.clientHeight }));
        observer.observe(node);
        // O navegador só deixa cancelar a rolagem em ouvinte não passivo; no PDF, a roda rola as páginas.
        const onWheel = event => {
            if (isPdf && !event.ctrlKey) return;
            event.preventDefault();
            setZoom(value => clampZoom(value - event.deltaY * 0.002));
        };
        node.addEventListener('wheel', onWheel, { passive: false });
        return () => { observer.disconnect(); node.removeEventListener('wheel', onWheel); };
    }, [isPdf]);

    const download = async () => {
        setDownloading(true); setProblem('');
        try {
            const current = (await getFreshFiles())[index] || file;
            const response = await fetch(current.url);
            if (!response.ok) throw new Error('download_failed');
            const href = URL.createObjectURL(await response.blob());
            const link = document.createElement('a');
            link.href = href;
            link.download = attachmentFileName(clientName, index, current);
            document.body.append(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(href), 1000);
        } catch {
            setProblem('Não foi possível baixar agora. Tente novamente.');
        } finally {
            setDownloading(false);
        }
    };

    const startDrag = event => {
        if (event.button !== 0) return;
        drag.current = { x: event.clientX, y: event.clientY, left: stageRef.current.scrollLeft, top: stageRef.current.scrollTop };
    };
    const moveDrag = event => {
        if (!drag.current) return;
        stageRef.current.scrollLeft = drag.current.left - (event.clientX - drag.current.x);
        stageRef.current.scrollTop = drag.current.top - (event.clientY - drag.current.y);
    };
    const endDrag = () => { drag.current = null; };

    const alt = `Anexo ${index + 1} de ${clientName || 'cliente'}`;
    return createPortal(<div className="prescription-viewer" role="dialog" aria-modal="true" aria-label={`${position} de ${clientName || 'cliente'}`}>
        <div className="prescription-viewer-bar">
            <strong>{position}</strong>
            {files.length > 1 && <span className="prescription-viewer-group">
                <button type="button" onClick={() => goTo(-1)} aria-label="Anexo anterior" title="Anexo anterior"><ChevronLeft size={20} aria-hidden="true" /></button>
                <button type="button" onClick={() => goTo(1)} aria-label="Próximo anexo" title="Próximo anexo"><ChevronRight size={20} aria-hidden="true" /></button>
            </span>}
            <span className="prescription-viewer-group">
                <button type="button" onClick={() => setZoom(value => clampZoom(value - 0.25))} aria-label="Diminuir zoom" title="Diminuir zoom" disabled={zoom <= MIN_ZOOM}><Minus size={20} aria-hidden="true" /></button>
                <button type="button" className="prescription-viewer-zoom" onClick={() => setZoom(1)} title="Voltar ao tamanho da tela" aria-label={`Zoom em ${Math.round(zoom * 100)}%. Voltar ao tamanho da tela`}>{Math.round(zoom * 100)}%</button>
                <button type="button" onClick={() => setZoom(value => clampZoom(value + 0.25))} aria-label="Aumentar zoom" title="Aumentar zoom" disabled={zoom >= MAX_ZOOM}><Plus size={20} aria-hidden="true" /></button>
            </span>
            <button type="button" onClick={() => setRotation(value => (value + 90) % 360)} aria-label="Girar" title="Girar"><RotateCw size={20} aria-hidden="true" /></button>
            <button type="button" className="prescription-viewer-download" onClick={download} disabled={downloading}>
                {downloading ? <LoaderCircle className="prescription-spin" size={18} aria-hidden="true" /> : <Download size={18} aria-hidden="true" />} Baixar
            </button>
            <button type="button" ref={closeRef} onClick={onClose} aria-label="Fechar" title="Fechar"><X size={22} aria-hidden="true" /></button>
        </div>
        {problem && <p className="prescription-viewer-problem" role="alert">{problem}</p>}
        <div className="prescription-viewer-stage" ref={stageRef} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerLeave={endDrag} onPointerCancel={endDrag}>
            {isPdf
                ? <PdfPages key={file.url} file={file} zoom={zoom} rotation={rotation} stage={stage} onError={showLoadProblem} />
                : <ImagePage key={file.url} file={file} alt={alt} zoom={zoom} rotation={rotation} stage={stage} onError={showLoadProblem} />}
        </div>
    </div>, document.body);
}

// Miniaturas dos anexos de uma solicitação. Os links só são pedidos quando a linha aparece na tela.
export default function PrescriptionFiles({ loadFiles, clientName, compact = false }) {
    const rootRef = useRef(null);
    const loaderRef = useRef(loadFiles);
    const loadedAtRef = useRef(0);
    const [state, setState] = useState({ status: 'idle', files: [] });
    const [viewerIndex, setViewerIndex] = useState(null);

    useEffect(() => { loaderRef.current = loadFiles; });

    const load = useCallback(async () => {
        const files = await loaderRef.current();
        loadedAtRef.current = Date.now();
        setState({ status: 'ready', files });
        return files;
    }, []);

    const retry = useCallback(() => {
        setState(current => ({ ...current, status: 'loading' }));
        load().catch(() => setState({ status: 'error', files: [] }));
    }, [load]);

    useEffect(() => {
        const node = rootRef.current;
        if (!node) return undefined;
        const observer = new IntersectionObserver(entries => {
            if (!entries.some(entry => entry.isIntersecting)) return;
            observer.disconnect();
            retry();
        }, { rootMargin: '200px' });
        observer.observe(node);
        return () => observer.disconnect();
    }, [retry]);

    const getFreshFiles = useCallback(async () => {
        if (Date.now() - loadedAtRef.current < LINK_REFRESH_MS) return state.files;
        return load();
    }, [load, state.files]);

    const open = async index => {
        // Sem conseguir renovar, abre com o link atual e o visualizador avisa se ele tiver vencido.
        try { await getFreshFiles(); } catch { /* Mantém os links que já estão na tela. */ }
        setViewerIndex(index);
    };

    const closeViewer = useCallback(() => setViewerIndex(null), []);
    const { status, files } = state;
    const visible = compact ? files.slice(0, COMPACT_LIMIT) : files;
    const hidden = files.length - visible.length;

    return <div className={`prescription-files ${compact ? 'compact' : ''}`} ref={rootRef}>
        {(status === 'idle' || status === 'loading') && <p className="prescription-files-note" role="status"><LoaderCircle className="prescription-spin" size={15} aria-hidden="true" /> Carregando anexos…</p>}
        {status === 'error' && <p className="prescription-files-note" role="alert">Não foi possível carregar os anexos. <button type="button" className="prescription-files-retry" onClick={retry}><RefreshCw size={14} aria-hidden="true" /> Tentar de novo</button></p>}
        {status === 'ready' && !files.length && <p className="prescription-files-note">Sem anexo.</p>}
        {status === 'ready' && files.length > 0 && <>
            <p className="prescription-files-label"><Paperclip size={15} aria-hidden="true" /> {files.length === 1 ? '1 anexo' : `${files.length} anexos`}</p>
            <div className="prescription-files-grid">
                {visible.map((file, index) => <button type="button" key={file.name || index} className="prescription-thumb" onClick={() => open(index)} aria-label={`Abrir anexo ${index + 1} de ${clientName || 'cliente'}`} title="Abrir">
                    {isPdfFile(file) ? <PdfThumb url={file.url} /> : <ImageThumb url={file.url} alt="" />}
                    {isPdfFile(file) && <span className="prescription-thumb-badge">PDF</span>}
                    <span className="prescription-thumb-open"><Maximize2 size={14} aria-hidden="true" /></span>
                </button>)}
                {hidden > 0 && <button type="button" className="prescription-thumb prescription-thumb-more" onClick={() => open(COMPACT_LIMIT)} aria-label={`Abrir os outros ${hidden} anexos`}>+{hidden}</button>}
            </div>
        </>}
        {viewerIndex !== null && files[viewerIndex] && <PrescriptionViewer files={files} startIndex={viewerIndex} clientName={clientName} getFreshFiles={getFreshFiles} onClose={closeViewer} />}
    </div>;
}
