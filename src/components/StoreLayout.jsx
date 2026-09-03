import Header from './Header';
import Footer from './Footer';
import FloatingWhatsApp from './FloatingWhatsApp';
import { Link, useLocation } from 'react-router-dom';
import { Eye, ShieldCheck } from 'lucide-react';
import { isAdminPreview } from '../utils/adminPreview';

const StoreLayout = ({ children, search, searchTerm, onSearchChange }) => {
    const location = useLocation();
    const adminPreview = isAdminPreview(location.search);

    return (
        <div className="page-root">
            {adminPreview && <div className="admin-preview-bar"><div><ShieldCheck size={15} /><span>Visualização administrativa: os dados e ações de clientes não estão sendo alterados.</span></div><Link to="/admin"><Eye size={15} /> Voltar ao painel</Link></div>}
            <Header showSearch={search} searchTerm={searchTerm} onSearchChange={onSearchChange} />
            <main>{children}</main>
            <Footer />
            <FloatingWhatsApp />
            {adminPreview && <style>{adminPreviewStyles}</style>}
        </div>
    );
};

const adminPreviewStyles = `.admin-preview-bar{position:relative;z-index:120;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:9px max(16px,calc((100vw - 1180px)/2));background:#102a3b;border-bottom:1px solid rgba(103,220,243,.35);color:#c8f5fb;font-size:.72rem;font-weight:700}.admin-preview-bar>div,.admin-preview-bar a{display:flex;align-items:center;gap:7px}.admin-preview-bar svg{color:#67dcf3;flex-shrink:0}.admin-preview-bar a{padding:6px 10px;border:1px solid rgba(103,220,243,.35);border-radius:7px;color:#e8fbff;white-space:nowrap}.admin-preview-bar a:hover{background:rgba(103,220,243,.1)}@media(max-width:560px){.admin-preview-bar{align-items:flex-start;flex-direction:column;padding:10px 14px}.admin-preview-bar a{width:100%;justify-content:center}}`;

export default StoreLayout;
