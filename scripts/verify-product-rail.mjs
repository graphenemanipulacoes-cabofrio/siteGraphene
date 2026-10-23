// Unit-level event tests against a fake scroll element; no browser automation.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import { transform } from 'esbuild';

const context = createContext({ window: { matchMedia: () => ({ matches: true }) } });
const element = (type, props) => ({ type, props });
const react = new SyntheticModule(['Children', 'useCallback', 'useEffect', 'useRef', 'useState'], function() {
    this.setExport('Children', { count: items => items.length });
    this.setExport('useCallback', fn => fn);
    this.setExport('useEffect', () => {});
    this.setExport('useRef', value => ({ current: value }));
    this.setExport('useState', value => [value, () => {}]);
}, { context });
const jsx = new SyntheticModule(['jsx', 'jsxs'], function() { this.setExport('jsx', element); this.setExport('jsxs', element); }, { context });
const icons = new SyntheticModule(['ChevronLeft', 'ChevronRight'], function() { this.setExport('ChevronLeft', () => null); this.setExport('ChevronRight', () => null); }, { context });
const compiled = await transform(readFileSync('src/components/ProductRail.jsx', 'utf8'), { loader: 'jsx', jsx: 'automatic', format: 'esm' });
const module = new SourceTextModule(compiled.code, { context });
await module.link(name => name === 'react' ? react : name === 'react/jsx-runtime' ? jsx : icons);
await module.evaluate();
const root = module.namespace.default({ id: 'test', label: 'Test', className: 'vt-grid', children: ['a', 'b'] });
const props = root.props.children[0].props;
let captured = false;
const scrollCalls = [];
const rail = {
    scrollLeft: 100, scrollWidth: 2400, clientWidth: 900,
    setPointerCapture: () => { captured = true; }, hasPointerCapture: () => captured,
    releasePointerCapture: () => { captured = false; },
    scrollBy: value => scrollCalls.push(value), scrollTo: value => scrollCalls.push(value),
};
props.ref.current = rail;
const event = (changes = {}) => ({
    pointerType: 'mouse', pointerId: 1, button: 0, buttons: 1, clientX: 200,
    currentTarget: rail, target: { closest: () => null }, preventDefault() {}, stopPropagation() {}, ...changes,
});
props.onPointerDown(event());
props.onPointerMove(event({ clientX: 197 }));
assert.equal(rail.scrollLeft, 100); // A click must not be treated as a drag.
props.onPointerMove(event({ clientX: 150 }));
assert.equal(rail.scrollLeft, 150);
assert.equal(captured, true);
props.onPointerUp(event({ clientX: 150 }));
assert.equal(captured, false);
let prevented = false;
props.onClickCapture(event({ detail: 1, preventDefault: () => { prevented = true; } }));
assert.equal(prevented, true); // Dragging a linked card must not open it.
prevented = false;
props.onPointerDown(event()); props.onPointerUp(event());
props.onClickCapture(event({ detail: 1, preventDefault: () => { prevented = true; } }));
assert.equal(prevented, false); // Normal clicks still work.
props.onPointerDown(event());
props.onPointerMove(event({ buttons: 0, clientX: 100 }));
props.onPointerMove(event({ clientX: 50 }));
assert.equal(rail.scrollLeft, 150); // Releasing outside must not turn hover into drag.
props.onPointerDown(event()); props.onPointerLeave(event());
props.onPointerMove(event({ clientX: 50 }));
assert.equal(rail.scrollLeft, 150);
props.onPointerDown(event({ pointerType: 'touch' }));
props.onPointerMove(event({ pointerType: 'touch', clientX: 50 }));
assert.equal(rail.scrollLeft, 150); // Touch keeps native scrolling.
props.onPointerDown(event({ target: { closest: () => ({ tagName: 'BUTTON' }) } }));
props.onPointerMove(event({ clientX: 50 }));
assert.equal(rail.scrollLeft, 150); // Variant and buy buttons are not dragged.
props.onKeyDown(event({ target: rail, key: 'ArrowRight' }));
assert.equal(scrollCalls.at(-1).left, 720);
assert.equal(scrollCalls.at(-1).behavior, 'auto'); // Respects reduced motion.
props.onKeyDown(event({ target: rail, key: 'Home' }));
assert.equal(scrollCalls.at(-1).left, 0);
props.onKeyDown(event({ target: rail, key: 'End' }));
assert.equal(scrollCalls.at(-1).left, 2400);
const count = scrollCalls.length;
props.onKeyDown(event({ key: 'ArrowLeft' }));
assert.equal(scrollCalls.length, count); // Child inputs retain keyboard behavior.
console.log('Product rail unit checks passed: drag threshold, mouse movement, capture release, click suppression, ordinary clicks, native touch, protected buttons, keyboard navigation and reduced motion.');
