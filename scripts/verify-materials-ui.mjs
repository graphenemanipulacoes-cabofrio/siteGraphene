// Render-only fixtures: no real catalogue writes, sessions, files or uploads.
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

let fixtures = [{ id: 901, name: 'Matéria de teste', lab: 'Fornecedor sintético', category: 'Categoria personalizada', headline: 'Apresentação de teste', description: 'Descrição sintética.', tags: ['Tag de teste'], image_url: '/assets/logo.png' }];
let edit = false;
const server = await createServer({
    configLoader: 'native', server: { middlewareMode: true },
    cacheDir: 'node_modules/.vite-materials-test', optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [{ name: 'isolated-materials-test', enforce: 'pre', transform(code, id) {
        const path = id.replaceAll('\\', '/').split('?')[0];
        if (['Header', 'Footer', 'FloatingWhatsApp'].some(name => path.endsWith(`/src/components/${name}.jsx`))) return { code: 'export default function Stub(){return null}', map: null };
        if (path.endsWith('/src/lib/materialsApi.js')) return { code: `export const adminMaterialsApi = {list:async()=>${JSON.stringify(fixtures)}}; export const listPublicMaterials = adminMaterialsApi.list;`, map: null };
        if (path.endsWith('/src/pages/AtivosPage.jsx')) return { code: code.replace('useState([])', `useState(${JSON.stringify(fixtures)})`).replace('useState(true)', 'useState(false)'), map: null };
        if (path.endsWith('/src/components/AdminMaterials.jsx')) return { code: code.replace('useState([])', `useState(${JSON.stringify(fixtures)})`).replace('useState(true)', 'useState(false)').replace('const [editor, setEditor] = useState(null)', `const [editor, setEditor] = useState(${edit ? JSON.stringify(fixtures[0]) : 'null'})`), map: null };
    } }],
});
const render = component => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(component)));
try {
    let PublicPage = (await server.ssrLoadModule('/src/pages/AtivosPage.jsx')).default;
    let AdminPage = (await server.ssrLoadModule('/src/components/AdminMaterials.jsx')).default;
    const publicHtml = render(PublicPage);
    assert.ok(publicHtml.includes('Categoria personalizada'));
    assert.ok(publicHtml.includes('alt="Matéria de teste"'));
    assert.ok(publicHtml.includes('src="/assets/logo.png"'));
    assert.ok(publicHtml.includes('Tag de teste'));
    const adminHtml = render(AdminPage);
    assert.ok(adminHtml.includes('Nova matéria-prima'));
    assert.ok(adminHtml.includes('Excluir Matéria de teste'));
    assert.ok(adminHtml.includes('Fornecedor sintético'));
    edit = true; server.moduleGraph.invalidateAll();
    AdminPage = (await server.ssrLoadModule('/src/components/AdminMaterials.jsx')).default;
    const editor = render(AdminPage);
    for (const label of ['Editar matéria-prima', 'Substituir imagem', 'Remover imagem', 'Fornecedor / laboratório', 'Descrição', 'Salvar matéria-prima']) assert.ok(editor.includes(label), label);
    assert.ok(editor.includes('aria-labelledby="material-editor-title"'));
    edit = false; fixtures = []; server.moduleGraph.invalidateAll();
    PublicPage = (await server.ssrLoadModule('/src/pages/AtivosPage.jsx')).default;
    const empty = render(PublicPage);
    assert.ok(empty.includes('Consulte nossa equipe sobre as matérias-primas disponíveis.'));
    assert.ok(!empty.includes('Ormona'), 'Deleted entries must not reappear from a hardcoded fallback');
    console.log('Materials render checks passed: dynamic categories/catalogue, thumbnails, admin controls, image replacement/removal, accessible editor and empty catalogue without resurrecting deleted entries.');
} finally { await server.close(); }
