import { useState, useEffect, useCallback } from 'react';
import { Package, PackageCheck, MessageCircle, FileText, LogOut, ChevronDown, ChevronUp, Download, Maximize2, X, ZoomIn, Trash2, RotateCcw, Archive, ArrowLeft, Users, Shield, ExternalLink, WalletCards } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Toaster, toast } from 'sonner';
import AdminProducts from '../components/AdminProducts';
import AdminOrders from '../components/AdminOrders';
import AdminFinance from '../components/AdminFinance';
import { getSession, destroySession } from '../utils/security';

const Admin = () => {
    const [requests, setRequests] = useState([]);
    const [expandedId, setExpandedId] = useState(null);
    const [fullscreenImage, setFullscreenImage] = useState(null);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [view, setView] = useState(localStorage.getItem('admin_view') || 'active');
    const [admins, setAdmins] = useState([]);
    const [newAdminUser, setNewAdminUser] = useState('');
    const [newAdminPass, setNewAdminPass] = useState('');
    const [partners, setPartners] = useState([]);
    const [selectedPartner, setSelectedPartner] = useState(null);
    const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
    const navigate = useNavigate();

    const fetchRequests = useCallback(async () => {
        const { data, error } = await supabase
            .from('solicitacoes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching requests:', error);
        } else {
            const filtered = data.filter(req => {
                const status = req.status || 'active';
                return view === 'active' ? status !== 'trash' : status === 'trash';
            });
            setRequests(filtered || []);
        }
    }, [view]);

    useEffect(() => {
        localStorage.setItem('admin_view', view);
    }, [view]);

    useEffect(() => {
        const session = getSession();
        if (!session) {
            navigate('/login');
            return;
        }
    }, [navigate]);

    useEffect(() => {
        if (view === 'active' || view === 'trash') {
            fetchRequests();
        }

        // Request browser notification permission
        if ('Notification' in window) {
            Notification.requestPermission();
        }

        // Realtime Subscription
        const channel = supabase
            .channel('realtime-solicitacoes')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'solicitacoes' },
                (payload) => {
                    handleNewRequest(payload.new);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchRequests, view]);

    // Also refetch when view changes to active/trash
    useEffect(() => {
        if (view === 'active' || view === 'trash') {
            fetchRequests();
        }
        if (view === 'admins') {
            fetchAdmins();
        }
        if (view === 'partners') {
            fetchPartners();
        }
    }, [view, fetchRequests]);

    const handleNewRequest = (newRequest) => {
        // 1. Play Sound
        try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(e => console.log('Audio play blocked:', e));
        } catch (e) {
            console.error('Audio error:', e);
        }

        // 2. Browser Notification
        if (Notification.permission === 'granted') {
            new Notification('Nova Solicitação Recebida!', {
                body: `${newRequest.nome_cliente} enviou uma nova receita.`,
                icon: '/vite.svg' // Fallback icon
            });
        }

        // 3. In-App Toast
        toast.success(`Nova solicitação de ${newRequest.nome_cliente}!`);

        // 4. Update State (add to top)
        // Only add if we represent 'active' view logic (new requests are active by default)
        // And if we are currently viewing 'active'
        // Actually, let's just re-fetch or prepend safely.
        // Prepending is better UX for immediate feedback.
        // Check if it should be in active view (default is active)
        if (!newRequest.status || newRequest.status === 'active') {
            setRequests(prev => [newRequest, ...prev]);
        }
    };

    const updateStatus = async (id, newStatus) => {
        console.log(`Attempting to update status for ID: ${id} to ${newStatus}`);
        try {
            const { error } = await supabase
                .from('solicitacoes')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) {
                console.error('Supabase update error:', error);
                throw error;
            }

            setRequests(prev => prev.filter(req => req.id !== id));
            toast.success(newStatus === 'trash' ? 'Movido para lixeira' : 'Restaurado com sucesso');

        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Erro ao atualizar status: ' + (error.message || 'Erro desconhecido'));
        }
    };

    const deleteForever = async (id) => {
        console.log(`Attempting to delete forever ID: ${id}`);
        if (!confirm('Tem certeza? Isso apagará a solicitação e os arquivos permanentemente.')) return;

        try {
            const { error } = await supabase
                .from('solicitacoes')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Supabase delete error:', error);
                throw error;
            }

            setRequests(prev => prev.filter(req => req.id !== id));
            toast.success('Excluído permanentemente.');
        } catch (error) {
            console.error('Error deleting:', error);
            toast.error('Erro ao excluir: ' + (error.message || 'Erro desconhecido'));
        }
    };

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const handleWheel = (e) => {
        if (fullscreenImage) {
            e.preventDefault();
            const delta = e.deltaY * -0.01;
            setZoomLevel(prev => Math.min(Math.max(0.5, prev + delta), 4));
        }
    };

    const closeFullscreen = () => {
        setFullscreenImage(null);
        setZoomLevel(1);
    };

    const getFiles = (urlOrJson) => {
        try {
            if (urlOrJson.startsWith('[')) {
                return JSON.parse(urlOrJson);
            }
            return [urlOrJson];
        } catch {
            return [urlOrJson];
        }
    };

    const fetchAdmins = async () => {
        const session = getSession();
        const { data, error } = await supabase.functions.invoke('admin-orders', {
            body: { action: 'list_admins' }, headers: { 'x-admin-token': session?.token || '' }
        });
        if (error || data?.error) toast.error('Erro ao carregar administradores');
        else setAdmins(data.admins || []);
    };

    const handleAddAdmin = async (e) => {
        e.preventDefault();
        if (!newAdminUser || !newAdminPass) return toast.error('Preencha usuário e senha');

        if (newAdminPass.length < 10) return toast.error('Use uma senha com pelo menos 10 caracteres');
        const session = getSession();
        const { data, error } = await supabase.functions.invoke('admin-orders', {
            body: { action: 'add_admin', username: newAdminUser, password: newAdminPass },
            headers: { 'x-admin-token': session?.token || '' }
        });
        if (error || data?.error) {
            toast.error(data?.error === 'admin_exists' ? 'Esse usuário já existe' : 'Erro ao adicionar admin');
        } else {
            toast.success('Admin adicionado!');
            setNewAdminUser('');
            setNewAdminPass('');
            fetchAdmins();
        }
    };

    const handleDeleteAdmin = async (id) => {
        if (!confirm('Remover este administrador?')) return;
        const session = getSession();
        const { data, error } = await supabase.functions.invoke('admin-orders', {
            body: { action: 'delete_admin', adminId: id }, headers: { 'x-admin-token': session?.token || '' }
        });
        if (error || data?.error) toast.error(data?.error === 'protected_admin' ? 'Não é possível remover o próprio acesso ou o último administrador' : 'Erro ao remover');
        else {
            toast.success('Admin removido');
            fetchAdmins();
        }
    };

    const fetchPartners = async () => {
        const { data, error } = await supabase
            .from('parceiros')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching partners:', error);
            toast.error('Erro ao carregar parceiros');
        } else {
            setPartners(data || []);
        }
    };

    const updatePartner = async (partnerId, updatedData) => {
        try {
            const { error } = await supabase
                .from('parceiros')
                .update(updatedData)
                .eq('id', partnerId);

            if (error) throw error;

            toast.success('Dados do parceiro atualizados!');
            setPartners(prev => prev.map(p => p.id === partnerId ? { ...p, ...updatedData } : p));
            setIsPartnerModalOpen(false);
            setSelectedPartner(null);
        } catch (error) {
            console.error('Error updating partner:', error);
            toast.error('Erro ao salvar alterações');
        }
    };

    const handleLogout = useCallback(() => {
        const session = getSession();
        if (session?.token) {
            supabase.functions.invoke('admin-orders', {
                body: { action: 'logout' },
                headers: { 'x-admin-token': session.token }
            }).catch(() => {});
        }
        destroySession();
        navigate('/login');
    }, [navigate]);

    return (
        <div className="admin-container">
            <style>{`
                .admin-container {
                    display: grid;
                    grid-template-columns: 272px minmax(0, 1fr);
                    min-height: 100vh;
                    background: radial-gradient(circle at 78% -12%, rgba(34, 199, 232, .11), transparent 28rem), #071018;
                }
                .admin-sidebar {
                    padding: 24px 16px 18px;
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    position: sticky;
                    top: 0;
                    border-right: 1px solid rgba(203, 213, 225, .10);
                    background: linear-gradient(180deg, rgba(12, 22, 35, .98), rgba(7, 16, 27, .98));
                    box-shadow: 16px 0 44px rgba(0, 0, 0, .18);
                    z-index: 2;
                }
                .admin-brand { display:flex; align-items:center; gap:11px; padding:4px 10px 26px; }
                .admin-brand-mark { display:grid; place-items:center; width:35px; height:35px; border-radius:11px; background:linear-gradient(135deg, #22c7e8, #24d39a); color:#031319; font-weight:900; font-size:.78rem; letter-spacing:-1px; box-shadow:0 8px 24px rgba(34,199,232,.22); }
                .admin-brand-copy { display:grid; gap:1px; }
                .admin-brand-copy strong { font-family:var(--font-heading); font-size:1rem; letter-spacing:.05em; }
                .admin-brand-copy span { color:var(--text-subtle); font-size:.67rem; font-weight:700; letter-spacing:.1em; }
                .admin-nav { display:grid; gap:5px; flex:1; align-content:start; }
                .admin-nav-label { color:#60728a; font-size:.63rem; font-weight:800; letter-spacing:.14em; margin:12px 10px 6px; }
                .admin-nav-link { justify-content:flex-start!important; width:100%; min-height:44px; padding:10px 12px!important; border-radius:10px!important; background:transparent!important; border:1px solid transparent!important; color:#9fafc1!important; box-shadow:none!important; font-size:.86rem!important; }
                .admin-nav-link:hover { background:rgba(255,255,255,.055)!important; color:#fff!important; transform:none!important; }
                .admin-nav-link.active { background:linear-gradient(90deg, rgba(34,199,232,.17), rgba(34,199,232,.04))!important; border-color:rgba(34,199,232,.18)!important; color:#8ce8f8!important; box-shadow:inset 3px 0 0 #22c7e8!important; }
                .admin-nav-link.active svg { color:#22c7e8; }
                .admin-sidebar-footer { border-top:1px solid rgba(203,213,225,.09); padding:15px 4px 0; }
                .admin-logout { width:100%; justify-content:flex-start!important; padding:10px 12px!important; border-radius:10px!important; color:#9fafc1!important; background:transparent!important; border:1px solid transparent!important; box-shadow:none!important; }
                .admin-logout:hover { color:#fda4af!important; background:rgba(251,113,133,.08)!important; transform:none!important; }
                .lg-hidden { display:none; }
                .lg-visible { display:block; }
                .admin-main { min-width:0; height:100vh; overflow-y:auto; padding:clamp(28px, 4vw, 58px); scrollbar-width:thin; scrollbar-color:rgba(148,163,184,.28) transparent; }
                .admin-content { width:min(100%, 1370px); margin:0 auto; }
                .admin-page-header { display:flex; justify-content:space-between; align-items:flex-end; gap:22px; padding:0 0 28px; margin-bottom:26px; border-bottom:1px solid rgba(203,213,225,.09); }
                .admin-page-heading { display:grid; gap:8px; }
                .admin-eyebrow { color:#67dcf3; font-size:.68rem; font-weight:800; letter-spacing:.14em; }
                .admin-page-title { font-size:clamp(1.7rem, 3vw, 2.45rem)!important; font-weight:800; letter-spacing:-.045em; color:#f8fafc; }
                .admin-page-copy { color:#8fa0b6; font-size:.86rem; }
                .admin-header-actions { display:flex; align-items:center; gap:10px; }
                .admin-site-link { min-height:40px!important; padding:9px 14px!important; border-radius:9px!important; font-size:.78rem!important; }
                .admin-role { color:#73849a; border:1px solid rgba(203,213,225,.12); padding:7px 9px; border-radius:7px; font-size:.63rem; font-weight:800; letter-spacing:.1em; }
                .admin-main .lux-product-card { padding:22px; border:1px solid rgba(203,213,225,.11); border-radius:15px; background:linear-gradient(145deg,rgba(18,31,47,.92),rgba(10,20,33,.92)); box-shadow:0 10px 26px rgba(0,0,0,.15); overflow:hidden; }
                .admin-main .lux-product-card:hover { border-color:rgba(103,220,243,.28); transform:none; box-shadow:0 12px 30px rgba(0,0,0,.2); }
                .admin-section-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; padding-bottom:16px; margin-bottom:3px; border-bottom:1px solid rgba(203,213,225,.09); }
                .admin-section-heading strong { font-family:var(--font-heading); font-size:1rem; }
                .admin-section-heading span { color:#7f91a7; font-size:.75rem; }
                .admin-request-list { display:grid; gap:2px; }
                .admin-request-row { border-bottom:1px solid rgba(203,213,225,.08)!important; padding:0!important; transition:background .18s ease; }
                .admin-request-row:last-child { border-bottom:0!important; }
                .admin-request-row:hover { background:rgba(255,255,255,.024); }
                .admin-settings-stack { display:grid!important; max-width:900px; gap:18px!important; }
                .admin-admin-form { display:grid!important; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px!important; align-items:end!important; }
                .admin-admin-field { min-width:0; }
                .admin-admin-field input { min-height:46px; }
                .admin-admin-submit { grid-column:span 2; width:max-content; min-width:190px; margin-top:2px!important; }
                .mobile-header,.bottom-nav { display:none; }
                @media (max-width:1024px) {
                    .admin-container { display:block; }
                    .admin-sidebar { display:none; }
                    .mobile-header { display:flex; align-items:center; justify-content:space-between; gap:12px; position:sticky; top:0; z-index:20; padding:13px 16px; background:rgba(7,16,27,.94); backdrop-filter:blur(18px); border-bottom:1px solid rgba(203,213,225,.1); }
                    .mobile-header .admin-brand { padding:0; }
                    .mobile-header .admin-brand-mark { width:30px; height:30px; border-radius:9px; font-size:.65rem; }
                    .mobile-header .admin-brand-copy strong { font-size:.9rem; }
                    .bottom-nav { display:flex; position:sticky; top:60px; z-index:19; overflow-x:auto; gap:7px; padding:9px 16px 10px; background:rgba(7,16,27,.94); backdrop-filter:blur(18px); border-bottom:1px solid rgba(203,213,225,.09); scrollbar-width:none; }
                    .bottom-nav::-webkit-scrollbar { display:none; }
                    .nav-item { flex:0 0 auto; display:flex; align-items:center; gap:6px; padding:8px 10px; border:1px solid transparent; border-radius:9px; color:#8fa0b6; font-size:.72rem; font-weight:700; white-space:nowrap; cursor:pointer; }
                    .nav-item.active { color:#8ce8f8; background:rgba(34,199,232,.12); border-color:rgba(34,199,232,.19); }
                    .nav-item:last-child { color:#fda4af; margin-left:auto; }
                    .nav-item svg { width:16px; height:16px; }
                    .admin-main { height:auto; min-height:calc(100vh - 108px); overflow:visible; padding:24px 16px 40px; }
                    .admin-page-header { align-items:flex-start; margin-bottom:20px; padding-bottom:20px; }
                    .admin-role { display:none; }
                    .request-item-header { flex-direction:column; align-items:flex-start!important; gap:.75rem!important; }
                    .request-item-actions { width:100%; justify-content:flex-start; gap:.5rem!important; }
                    .request-item-actions > * { flex:1; }
                    .admin-main .lux-product-card { padding:16px; border-radius:13px; }
                    .admin-settings-stack { max-width:none; }
                    .admin-admin-form { grid-template-columns:1fr; }
                    .admin-admin-submit { grid-column:auto; width:100%; }
                }
                @media (max-width:560px) {
                    .admin-page-header { flex-direction:column; gap:15px; }
                    .admin-header-actions { width:100%; justify-content:space-between; }
                    .admin-page-title { font-size:1.65rem!important; }
                    .admin-site-link { flex:1; justify-content:center!important; }
                    .lg-visible { display:none; }
                }
            `}</style>

            <div className="mobile-header">
                <div className="admin-brand">
                    <span className="admin-brand-mark">G</span>
                    <div className="admin-brand-copy"><strong>GRAPHÈNE</strong><span>PAINEL OPERACIONAL</span></div>
                </div>
                <Button variant="ghost" onClick={handleLogout} style={{ padding: '7px', color: '#fda4af' }} title="Sair"><LogOut size={19} /></Button>
            </div>

            <nav className="bottom-nav">
                <div className={`nav-item ${view === 'active' ? 'active' : ''}`} onClick={() => setView('active')}>
                    <MessageCircle size={22} />
                    <span>Orçamentos</span>
                </div>
                <div className={`nav-item ${view === 'orders' ? 'active' : ''}`} onClick={() => setView('orders')}>
                    <PackageCheck size={22} />
                    <span>Pedidos</span>
                </div>
                <div className={`nav-item ${view === 'finance' ? 'active' : ''}`} onClick={() => setView('finance')}>
                    <WalletCards size={22} />
                    <span>Financeiro</span>
                </div>
                <div className={`nav-item ${view === 'products' ? 'active' : ''}`} onClick={() => setView('products')}>
                    <Package size={22} />
                    <span>Produtos</span>
                </div>
                <div className={`nav-item ${view === 'admins' ? 'active' : ''}`} onClick={() => setView('admins')}>
                    <Users size={22} />
                    <span>Time</span>
                </div>
                <div className={`nav-item ${view === 'partners' ? 'active' : ''}`} onClick={() => setView('partners')}>
                    <Users size={22} />
                    <span>Parceiros</span>
                </div>
                <div className={`nav-item ${view === 'trash' ? 'active' : ''}`} onClick={() => setView('trash')}>
                    <Trash2 size={22} />
                    <span>Lixeira</span>
                </div>
            </nav>

            {/* Sidebar */}
            <aside className={`admin-sidebar ${expandedId === 'mobile-menu' ? 'open' : ''}`}>
                <div className="admin-brand">
                    <span className="admin-brand-mark">G</span>
                    <div className="admin-brand-copy"><strong>GRAPHÈNE</strong><span>PAINEL OPERACIONAL</span></div>
                    <Button variant="glass" className="lg-hidden" onClick={() => setExpandedId(null)} style={{ padding: '5px' }}>
                        <X size={20} />
                    </Button>
                </div>
                <nav className="admin-nav">
                    <span className="admin-nav-label">ATENDIMENTO</span>
                    <Button
                        variant="ghost"
                        className={`admin-nav-link ${view === 'active' ? 'active' : ''}`}
                        onClick={() => { setView('active'); setExpandedId(null); }}
                    >
                        <MessageCircle size={18} /> Solicitações
                    </Button>
                    <Button
                        variant="ghost"
                        className={`admin-nav-link ${view === 'orders' ? 'active' : ''}`}
                        onClick={() => { setView('orders'); setExpandedId(null); }}
                    >
                        <PackageCheck size={18} /> Pedidos e Entregas
                    </Button>
                    <Button
                        variant="ghost"
                        className={`admin-nav-link ${view === 'finance' ? 'active' : ''}`}
                        onClick={() => { setView('finance'); setExpandedId(null); }}
                    >
                        <WalletCards size={18} /> Financeiro
                    </Button>
                    <span className="admin-nav-label">GESTÃO</span>
                    <Button
                        variant="ghost"
                        className={`admin-nav-link ${view === 'products' ? 'active' : ''}`}
                        onClick={() => { setView('products'); setExpandedId(null); }}
                    >
                        <Package size={18} /> Produtos
                    </Button>
                    <Button
                        variant="ghost"
                        className={`admin-nav-link ${view === 'admins' ? 'active' : ''}`}
                        onClick={() => { setView('admins'); setExpandedId(null); }}
                    >
                        <Shield size={18} /> Admins
                    </Button>
                    <Button
                        variant="ghost"
                        className={`admin-nav-link ${view === 'partners' ? 'active' : ''}`}
                        onClick={() => { setView('partners'); setExpandedId(null); }}
                    >
                        <Users size={18} /> Parceiros
                    </Button>
                    <span className="admin-nav-label">SISTEMA</span>
                    <Button
                        variant="ghost"
                        className={`admin-nav-link ${view === 'trash' ? 'active' : ''}`}
                        onClick={() => { setView('trash'); setExpandedId(null); }}
                    >
                        <Trash2 size={18} /> Lixeira
                    </Button>
                </nav>
                <div className="admin-sidebar-footer"><Button variant="ghost" className="admin-logout" onClick={handleLogout}><LogOut size={18} /> Encerrar sessão</Button></div>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                <div className="admin-content">
                <Toaster position="top-right" richColors />
                <header className="admin-page-header">
                    <div className="admin-page-heading">
                        {view === 'trash' && (
                            <Button variant="glass" onClick={() => setView('active')} style={{ padding: '10px', borderRadius: '50%' }}>
                                <ArrowLeft size={24} />
                            </Button>
                        )}
                        <span className="admin-eyebrow">CENTRAL DE OPERAÇÕES</span>
                        <h1 className="admin-page-title">
                            {view === 'active' ? 'Solicitações' : view === 'orders' ? 'Pedidos e Entregas' : view === 'finance' ? 'Central Financeira' : view === 'products' ? 'Gerenciar Produtos' : view === 'admins' ? 'Gerenciar Admins' : view === 'partners' ? 'Parceiros' : 'Lixeira'}
                        </h1>
                        <p className="admin-page-copy">{view === 'orders' ? 'Acompanhe pagamentos, separação e envios em um só lugar.' : view === 'finance' ? 'Controle vendas, taxas, comissões, cupons e repasses em uma única área.' : view === 'active' ? 'Receitas e solicitações recebidas pelos canais da Graphène.' : 'Gerencie os dados operacionais da Graphène com segurança.'}</p>
                    </div>
                    <div className="admin-header-actions">
                        <span className="admin-role">ACESSO ADMINISTRATIVO</span>
                        <Button variant="outline" className="admin-site-link" onClick={() => window.location.href = '/'}>
                            🌐 Ver Site
                        </Button>
                    </div>
                </header>

                {view === 'orders' ? (
                    <AdminOrders onUnauthorized={handleLogout} />
                ) : view === 'finance' ? (
                    <AdminFinance onUnauthorized={handleLogout} />
                ) : view === 'products' ? (
                    <AdminProducts />
                ) : view === 'partners' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                                variant="outline"
                                onClick={() => window.open('/parceiros/cadastro', '_blank')}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
                            >
                                <ExternalLink size={16} /> Abrir Página de Cadastro
                            </Button>
                        </div>
                        <Card>
                            <div className="admin-section-heading"><strong>Gestão de parceiros</strong><span>{partners.length} cadastrados</span></div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                            <th style={{ padding: '1rem', opacity: 0.6 }}>Nome</th>
                                            <th style={{ padding: '1rem', opacity: 0.6 }}>WhatsApp</th>
                                            <th style={{ padding: '1rem', opacity: 0.6 }}>Status</th>
                                            <th style={{ padding: '1rem', opacity: 0.6, textAlign: 'right' }}>Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {partners.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>Nenhum parceiro encontrado.</td>
                                            </tr>
                                        ) : (
                                            partners.map(partner => (
                                                <tr key={partner.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <td style={{ padding: '1rem' }}>{partner.nome_completo}</td>
                                                    <td style={{ padding: '1rem' }}>{partner.whatsapp}</td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <span style={{
                                                            padding: '4px 10px',
                                                            borderRadius: '20px',
                                                            fontSize: '0.8rem',
                                                            fontWeight: '600',
                                                            background: partner.status === 'aprovado' ? 'rgba(37, 211, 102, 0.2)' : 'rgba(255, 193, 7, 0.2)',
                                                            color: partner.status === 'aprovado' ? '#25D366' : '#FFC107',
                                                            border: `1px solid ${partner.status === 'aprovado' ? '#25D366' : '#FFC107'}`
                                                        }}>
                                                            {partner.status.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                        <Button
                                                            variant="outline"
                                                            style={{ padding: '5px 15px', fontSize: '0.85rem' }}
                                                            onClick={() => {
                                                                setSelectedPartner(partner);
                                                                setIsPartnerModalOpen(true);
                                                            }}
                                                        >
                                                            Visualizar
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                ) : view === 'admins' ? (
                    <div className="admin-settings-stack">
                        <Card>
                            <div className="admin-section-heading"><strong>Novo administrador</strong><span>Acesso seguro ao painel</span></div>
                            <form className="admin-admin-form" onSubmit={handleAddAdmin}>
                                <div className="admin-admin-field">
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Usuário</label>
                                    <input type="text" value={newAdminUser} onChange={e => setNewAdminUser(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none' }} />
                                </div>
                                <div className="admin-admin-field">
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Senha</label>
                                    <input type="password" autoComplete="new-password" value={newAdminPass} onChange={e => setNewAdminPass(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none' }} />
                                </div>
                                <Button type="submit" variant="primary" className="admin-admin-submit" style={{ justifyContent: 'center' }}>Adicionar administrador</Button>
                            </form>
                        </Card>

                        <Card>
                            <div className="admin-section-heading"><strong>Administradores ativos</strong><span>{admins.length} com acesso</span></div>
                            <ul style={{ listStyle: 'none' }}>
                                {admins.map(admin => (
                                    <li key={admin.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <Shield size={20} color="var(--primary-blue)" />
                                            <span>{admin.username}</span>
                                        </div>
                                        <Button variant="outline" onClick={() => handleDeleteAdmin(admin.id)} style={{ borderColor: '#FF4D4D', color: '#FF4D4D', padding: '5px 10px', fontSize: '0.8rem' }}>Remover</Button>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
                        {/* List */}
                        <Card>
                            <div className="admin-section-heading"><strong>{view === 'active' ? 'Solicitações recebidas' : 'Itens na lixeira'}</strong><span>{requests.length} {requests.length === 1 ? 'registro' : 'registros'}</span></div>
                            <ul className="admin-request-list" style={{ listStyle: 'none' }}>
                                {requests.length === 0 ? (
                                    <p style={{ padding: '1rem', opacity: 0.7 }}>
                                        {view === 'active' ? 'Nenhuma solicitação encontrada.' : 'Lixeira vazia.'}
                                    </p>
                                ) : (
                                    requests.map(req => (
                                    <li key={req.id} className="admin-request-row" style={{ display: 'flex', flexDirection: 'column' }}>
                                            <div className="request-item-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ flex: 1 }}>
                                                    <strong style={{ fontSize: '1.1rem', color: '#fff', display: 'block', marginBottom: '4px' }}>{req.nome_cliente}</strong>
                                                    <div style={{ opacity: 0.5, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <FileText size={14} />
                                                        {new Date(req.created_at).toLocaleString()}
                                                    </div>
                                                </div>

                                                <div className="request-item-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    {view === 'active' ? (
                                                        // Active View Actions
                                                        <>
                                                            <a href={`https://wa.me/${req.whatsapp}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1 }}>
                                                                <Button variant="outline" style={{ borderColor: '#25D366', color: '#25D366', width: '100%', justifyContent: 'center', padding: '8px 12px' }}>
                                                                    <MessageCircle size={18} /> <span className="lg-visible">WhatsApp</span>
                                                                </Button>
                                                            </a>

                                                            {req.arquivo_url && (
                                                                <Button variant="primary" onClick={() => toggleExpand(req.id)} style={{ flex: 1, justifyContent: 'center', padding: '8px 12px', boxShadow: 'none' }}>
                                                                    <FileText size={18} /> <span className="lg-visible">Ver Arquivos</span>
                                                                    {expandedId === req.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                                </Button>
                                                            )}

                                                            <Button
                                                                variant="glass"
                                                                onClick={() => updateStatus(req.id, 'trash')}
                                                                title="Mover para Lixeira"
                                                                style={{ padding: '8px', color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.1)', background: 'transparent' }}
                                                            >
                                                                <Trash2 size={20} />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        // Trash View Actions
                                                        <>
                                                            <Button variant="outline" onClick={() => updateStatus(req.id, 'active')} style={{ borderColor: '#00E5FF', color: '#00E5FF' }}>
                                                                <RotateCcw size={18} /> Restaurar
                                                            </Button>

                                                            <Button variant="outline" onClick={() => deleteForever(req.id)} style={{ borderColor: '#FF4D4D', color: '#FF4D4D' }}>
                                                                <X size={18} /> Excluir
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Expanded Content */}
                                            {expandedId === req.id && req.arquivo_url && (
                                                <div style={{ background: 'rgba(0, 229, 255, 0.05)', padding: '1.5rem', margin: '0 1rem 1rem 1rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                    <p style={{ opacity: 0.7, marginBottom: '0.5rem' }}>Arquivos Anexados:</p>

                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                                        {getFiles(req.arquivo_url).map((url, idx) => (
                                                            <div key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '10px' }}>
                                                                {url.toLowerCase().endsWith('.pdf') ? (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', textAlign: 'center' }}>
                                                                        <FileText size={48} opacity={0.5} />
                                                                        <p style={{ fontSize: '0.9rem' }}>Documento PDF</p>
                                                                        <a href={url} target="_blank" download rel="noopener noreferrer">
                                                                            <Button variant="outline" style={{ width: '100%', justifyContent: 'center' }}><Download size={16} /> Baixar</Button>
                                                                        </a>
                                                                    </div>
                                                                ) : (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                                        <div style={{ position: 'relative', cursor: 'zoom-in', height: '150px', width: '100%' }} onClick={() => setFullscreenImage(url)}>
                                                                            <img
                                                                                src={url}
                                                                                alt="Receita"
                                                                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.1)' }}
                                                                            />
                                                                            <div style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.7)', padding: '3px', borderRadius: '3px' }}>
                                                                                <Maximize2 size={14} color="white" />
                                                                            </div>
                                                                        </div>
                                                                        <a href={url} target="_blank" download rel="noopener noreferrer">
                                                                            <Button variant="outline" style={{ width: '100%', justifyContent: 'center' }}><Download size={16} /> Baixar</Button>
                                                                        </a>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </li>
                                    ))
                                )}
                            </ul>
                        </Card>
                    </div>
                )}


                {/* Lightbox / Fullscreen Viewer */}
                {fullscreenImage && (
                    <div
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.95)', zIndex: 9999,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden'
                        }}
                        onWheel={handleWheel}
                    >
                        {/* Controls */}
                        <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '1rem', zIndex: 10000 }}>
                            <a href={fullscreenImage} download target="_blank" rel="noopener noreferrer">
                                <Button variant="glass"><Download size={24} /></Button>
                            </a>
                            <Button variant="glass" onClick={closeFullscreen}><X size={24} /></Button>
                        </div>

                        <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10000, pointerEvents: 'none' }}>
                            <span style={{ background: 'rgba(0,0,0,0.5)', padding: '5px 10px', borderRadius: '5px' }}>
                                Zoom: {Math.round(zoomLevel * 100)}% (Scroll para ajustar)
                            </span>
                        </div>

                        <img
                            src={fullscreenImage}
                            style={{
                                maxWidth: '100vw',
                                maxHeight: '100vh',
                                transform: `scale(${zoomLevel})`,
                                transition: 'transform 0.1s ease-out',
                                cursor: 'grab'
                            }}
                            draggable={false}
                        />
                    </div>
                )}

                {/* Partner Details Modal */}
                {isPartnerModalOpen && selectedPartner && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
                        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                    }}>
                        <div style={{ width: '100%', maxWidth: '600px', padding: '2.5rem', background: 'var(--bg-dark-secondary)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-md)', position: 'relative' }}>
                            <Button
                                variant="glass"
                                onClick={() => {
                                    setIsPartnerModalOpen(false);
                                    setSelectedPartner(null);
                                }}
                                style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', padding: '8px' }}
                            >
                                <X size={20} />
                            </Button>

                            <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', fontWeight: '800', color: 'var(--text-white)' }}>Detalhes do Parceiro</h2>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2.5rem' }}>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={modalLabelStyle}>Nome Completo</label>
                                    <input
                                        type="text"
                                        value={selectedPartner.nome_completo}
                                        onChange={(e) => setSelectedPartner({ ...selectedPartner, nome_completo: e.target.value })}
                                        style={modalInputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={modalLabelStyle}>Documento</label>
                                    <input
                                        type="text"
                                        value={selectedPartner.documento}
                                        onChange={(e) => setSelectedPartner({ ...selectedPartner, documento: e.target.value })}
                                        style={modalInputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={modalLabelStyle}>E-mail</label>
                                    <input
                                        type="email"
                                        value={selectedPartner.email}
                                        onChange={(e) => setSelectedPartner({ ...selectedPartner, email: e.target.value })}
                                        style={modalInputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={modalLabelStyle}>WhatsApp</label>
                                    <input
                                        type="text"
                                        value={selectedPartner.whatsapp}
                                        onChange={(e) => setSelectedPartner({ ...selectedPartner, whatsapp: e.target.value })}
                                        style={modalInputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={modalLabelStyle}>Status</label>
                                    <select
                                        value={selectedPartner.status}
                                        onChange={(e) => setSelectedPartner({ ...selectedPartner, status: e.target.value })}
                                        style={modalInputStyle}
                                    >
                                        <option value="pendente">PENDENTE</option>
                                        <option value="aprovado">APROVADO</option>
                                    </select>
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={modalLabelStyle}>Chave PIX</label>
                                    <input
                                        type="text"
                                        value={selectedPartner.chave_pix}
                                        onChange={(e) => setSelectedPartner({ ...selectedPartner, chave_pix: e.target.value })}
                                        style={modalInputStyle}
                                    />
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={modalLabelStyle}>Banco</label>
                                    <input
                                        type="text"
                                        value={selectedPartner.banco}
                                        onChange={(e) => setSelectedPartner({ ...selectedPartner, banco: e.target.value })}
                                        style={modalInputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={modalLabelStyle}>Agência</label>
                                    <input
                                        type="text"
                                        value={selectedPartner.agencia}
                                        onChange={(e) => setSelectedPartner({ ...selectedPartner, agencia: e.target.value })}
                                        style={modalInputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={modalLabelStyle}>Conta</label>
                                    <input
                                        type="text"
                                        value={selectedPartner.conta}
                                        onChange={(e) => setSelectedPartner({ ...selectedPartner, conta: e.target.value })}
                                        style={modalInputStyle}
                                    />
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={modalLabelStyle}>Data de Cadastro</label>
                                    <p style={{ ...modalValueStyle, opacity: 0.5, padding: '10px 0' }}>{new Date(selectedPartner.created_at).toLocaleString()}</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <Button
                                    variant="primary"
                                    onClick={() => updatePartner(selectedPartner.id, selectedPartner)}
                                    style={{ flex: 1, padding: '1rem', borderRadius: 'var(--radius-sm)' }}
                                >
                                    Salvar Alterações
                                </Button>
                                <Button
                                    variant="glass"
                                    onClick={() => {
                                        setIsPartnerModalOpen(false);
                                        setSelectedPartner(null);
                                    }}
                                    style={{ flex: 1, padding: '1rem', borderRadius: 'var(--radius-sm)' }}
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
                </div>
            </main>
        </div >
    );
};

const modalLabelStyle = {
    display: 'block',
    fontSize: '0.75rem',
    opacity: 0.4,
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: '600'
};

const modalValueStyle = {
    fontSize: '1rem',
    fontWeight: '500',
    color: '#fff'
};

const modalInputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.02)',
    color: '#fff',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s'
};

export default Admin;
