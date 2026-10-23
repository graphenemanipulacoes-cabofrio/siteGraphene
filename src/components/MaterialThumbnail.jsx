import { useState } from 'react';

export default function MaterialThumbnail({ src, name = '', className = '' }) {
    const [failed, setFailed] = useState(null);
    const initials = name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
    return <span className={`material-thumbnail ${className}`}>
        {src && failed !== src ? <img src={src} alt={name} loading="lazy" onError={() => setFailed(src)} />
            : <span className="material-initials" aria-label={`Sem imagem de ${name}`}>{initials || 'MP'}</span>}
    </span>;
}
