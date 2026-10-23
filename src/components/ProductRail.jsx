import { Children, useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function ProductRail({ children, className, id, label, resetKey, as: Track = 'div' }) {
    const railRef = useRef(null);
    const dragRef = useRef(null);
    const suppressClick = useRef(false);
    const [dragging, setDragging] = useState(false);
    const [edges, setEdges] = useState({ start: true, end: true });
    const count = Children.count(children);
    const updateEdges = useCallback(() => {
        const rail = railRef.current;
        if (!rail) return;
        const next = { start: rail.scrollLeft <= 1, end: rail.scrollWidth - rail.clientWidth - rail.scrollLeft <= 1 };
        setEdges(current => current.start === next.start && current.end === next.end ? current : next);
    }, []);

    useEffect(() => {
        const rail = railRef.current;
        if (!rail) return undefined;
        rail.scrollLeft = 0;
        const frame = requestAnimationFrame(updateEdges);
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateEdges);
        observer?.observe(rail);
        window.addEventListener('resize', updateEdges);
        return () => { cancelAnimationFrame(frame); observer?.disconnect(); window.removeEventListener('resize', updateEdges); };
    }, [resetKey, count, updateEdges]);

    const motion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    const move = direction => {
        const rail = railRef.current;
        if (rail) rail.scrollBy({ left: direction * rail.clientWidth * 0.8, behavior: motion() });
    };
    const pointerDown = event => {
        suppressClick.current = false;
        dragRef.current = null;
        // Touch/trackpad keep native scrolling. Option selectors remain clickable.
        if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('button, input, select, textarea, [role="radio"]')) return;
        dragRef.current = { id: event.pointerId, x: event.clientX, scrollLeft: event.currentTarget.scrollLeft, active: false };
    };
    const pointerMove = event => {
        const drag = dragRef.current;
        if (!drag || drag.id !== event.pointerId) return;
        if ((event.buttons & 1) === 0) { pointerEnd(event); return; }
        const delta = event.clientX - drag.x;
        if (!drag.active && Math.abs(delta) < 7) return;
        if (!drag.active) {
            drag.active = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(true);
        }
        event.preventDefault();
        event.currentTarget.scrollLeft = drag.scrollLeft - delta;
    };
    const pointerEnd = event => {
        const drag = dragRef.current;
        if (!drag || drag.id !== event.pointerId) return;
        suppressClick.current = drag.active;
        dragRef.current = null;
        setDragging(false);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        updateEdges();
    };
    const keyDown = event => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1); }
        if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            event.currentTarget.scrollTo({ left: event.key === 'Home' ? 0 : event.currentTarget.scrollWidth, behavior: motion() });
        }
    };

    return <div className="vt-rail-shell">
        <Track id={id} ref={railRef} className={`${className} vt-rail${dragging ? ' is-dragging' : ''}`}
            role={Track === 'div' ? 'region' : undefined} aria-label={label} tabIndex={0}
            onScroll={updateEdges} onKeyDown={keyDown} onPointerDown={pointerDown} onPointerMove={pointerMove}
            onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onLostPointerCapture={pointerEnd}
            onPointerLeave={event => { if (!dragRef.current?.active) pointerEnd(event); }}
            onDragStart={event => event.preventDefault()}
            onClickCapture={event => {
                if (suppressClick.current && event.detail > 0) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; }
            }}>
            {children}
        </Track>
        {(!edges.start || !edges.end) && <div className="vt-rail-toolbar">
            <p>Arraste para o lado para explorar</p>
            <div className="vt-rail-controls">
                <button type="button" aria-label={`Voltar em ${label}`} aria-controls={id} disabled={edges.start} onClick={() => move(-1)}><ChevronLeft size={19} aria-hidden="true" /></button>
                <button type="button" aria-label={`Avançar em ${label}`} aria-controls={id} disabled={edges.end} onClick={() => move(1)}><ChevronRight size={19} aria-hidden="true" /></button>
            </div>
        </div>}
    </div>;
}
