// Regras e tela dos anexos de receita, só com dados sintéticos: nenhum arquivo real é aberto.
// Uso: node scripts/verify-prescription-files.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { attachmentFileName, hasAttachments, isPdfFile } from '../src/utils/prescriptionFiles.js';

assert.equal(isPdfFile({ name: 'intake/A.PDF' }), true);
assert.equal(isPdfFile({ name: 'intake/a.jpg' }), false);
assert.equal(isPdfFile(null), false);

assert.equal(hasAttachments(null), false);
assert.equal(hasAttachments(''), false);
assert.equal(hasAttachments('[]'), false);
assert.equal(hasAttachments('["intake/a.pdf"]'), true);
assert.equal(hasAttachments('https://exemplo.invalid/antigo.jpg'), true, 'registro antigo com um único endereço');

assert.equal(attachmentFileName('Maria José da Silva', 0, { name: 'intake/abc.PDF' }), 'receita-maria-jose-da-silva-1.pdf');
assert.equal(attachmentFileName('', 1, { name: 'b.png' }), 'receita-2.png');
assert.equal(attachmentFileName('../../etc', 0, { name: 'c.jpg' }), 'receita-etc-1.jpg', 'o nome do cliente não vira caminho');

const component = readFileSync('src/components/PrescriptionFiles.jsx', 'utf8');
assert.match(component, /URL\.revokeObjectURL/, 'o endereço temporário do download é liberado');
assert.match(component, /IntersectionObserver/, 'só pede os links quando a linha aparece na tela');
assert.doesNotMatch(component, /<iframe|<embed|<object/, 'a CSP não libera frames do Storage');
assert.match(readFileSync('src/lib/pdfPreview.js', 'utf8'), /isEvalSupported: false/, 'a CSP não permite eval');
const styles = readFileSync('src/styles/prescription-files.css', 'utf8');
assert.match(styles, /@media print[\s\S]*\.prescription-files/, 'receitas não saem na ficha impressa');
for (const page of ['src/pages/Admin.jsx', 'src/pages/CounterPage.jsx']) assert.match(readFileSync(page, 'utf8'), /<PrescriptionFiles/, page);

console.log('Prescription file checks passed: PDF detection, attachment rules, safe download names, lazy links, no frames, no eval and hidden when printing. No real files touched.');
