// Mostra PDFs de receita sem iframe: a CSP do site não libera frames do Storage, e celulares
// não exibem PDF dentro de iframe. A biblioteca só carrega quando existe um PDF na tela.
let library = null;

const loadLibrary = () => {
    library ||= Promise.all([
        import('pdfjs-dist/legacy/build/pdf.min.mjs'),
        import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
    ]).then(([pdfjs, worker]) => {
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        return pdfjs;
    }).catch(error => {
        library = null;
        throw error;
    });
    return library;
};

export async function openPdf(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error('pdf_unavailable');
    const data = new Uint8Array(await response.arrayBuffer());
    const pdfjs = await loadLibrary();
    // isEvalSupported: a CSP não permite eval, e PDF enviado por cliente não deve executar nada.
    return pdfjs.getDocument({ data, isEvalSupported: false }).promise;
}

// Libera o trabalhador do PDF ao sair da tela. Nunca pode derrubar a tela que está fechando.
export function closePdf(doc) {
    doc?.loadingTask?.destroy()?.catch(() => {});
}

export function renderPdfPage(page, canvas, { width, rotation = 0 }) {
    const angle = (page.rotate + rotation) % 360;
    const scale = width / page.getViewport({ scale: 1, rotation: angle }).width;
    const viewport = page.getViewport({ scale, rotation: angle });
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    return page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport });
}
