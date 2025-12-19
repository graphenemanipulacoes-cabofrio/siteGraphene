import { useState, useEffect } from 'react';
import { Package, MessageCircle, FileText, LogOut, ChevronDown, ChevronUp, Download, Maximize2, X, ZoomIn, Trash2, RotateCcw, Archive, ArrowLeft, Users, Shield } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Toaster, toast } from 'sonner';
import AdminProducts from '../components/AdminProducts';

const Admin = () => {
    const [requests, setRequests] = useState([]);
    const [expandedId, setExpandedId] = useState(null);
    const [fullscreenImage, setFullscreenImage] = useState(null);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [view, setView] = useState(localStorage.getItem('admin_view') || 'active');
    const [admins, setAdmins] = useState([]);
    const [newAdminUser, setNewAdminUser] = useState('');
    const [newAdminPass, setNewAdminPass] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        localStorage.setItem('admin_view', view);
    }, [view]);

    useEffect(() => {
        const session = localStorage.getItem('admin_session');
        if (!session) {
            navigate('/login');
            return;
        }
    }, []);

    useEffect(() => {
        if (view !== 'products') {
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
    }, []);

    // Also refetch when view changes to active/trash
    useEffect(() => {
        if (view === 'active' || view === 'trash') {
            fetchRequests();
        }
        if (view === 'admins') {
            fetchAdmins();
        }
    }, [view]);

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

    const fetchRequests = async () => {
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
        } catch (e) {
            return [urlOrJson];
        }
    };

    const fetchAdmins = async () => {
        const { data, error } = await supabase.from('admins').select('*').order('created_at', { ascending: false });
        if (data) setAdmins(data);
    };

    const handleAddAdmin = async (e) => {
        e.preventDefault();
        if (!newAdminUser || !newAdminPass) return toast.error('Preencha usuário e senha');

        const { error } = await supabase.from('admins').insert([{ username: newAdminUser, password: newAdminPass }]);
        if (error) {
            toast.error('Erro ao adicionar admin');
        } else {
            toast.success('Admin adicionado!');
            setNewAdminUser('');
            setNewAdminPass('');
            fetchAdmins();
        }
    };

    const handleDeleteAdmin = async (id) => {
        if (!confirm('Remover este administrador?')) return;
        const { error } = await supabase.from('admins').delete().eq('id', id);
        if (error) toast.error('Erro ao remover');
        else {
            toast.success('Admin removido');
            fetchAdmins();
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('admin_session');
        navigate('/login');
    };

    return (
        <div className="admin-container">
            <style>{`
                .admin-container {
                    display: grid;
                    grid-template-columns: 250px 1fr;
                    min-height: 100vh;
                    background: var(--bg-dark);
                }
                .admin-sidebar {
                    padding: 2.5rem 2rem;
                    display: flex;
                    flex-direction: column;
                    gap: 2.5rem;
                    height: 100vh;
                    position: sticky;
                    top: 0;
                    border-right: 1px solid rgba(255, 255, 255, 0.03);
                    background: rgba(13, 17, 23, 0.4);
                    backdrop-filter: blur(20px);
                    box-shadow: 10px 0 30px rgba(0,0,0,0.2);
                }
                .lg-hidden {
                    display: none;
                }
                .lg-visible {
                    display: block;
                }
                .admin-main {
                    padding: clamp(1.5rem, 5vw, 4rem);
                    height: 100vh;
                    overflow-y: auto;
                    scrollbar-width: thin;
                    scrollbar-color: rgba(255,255,255,0.1) transparent;
                }
                .mobile-header {
                    display: none;
                    justify-content: center;
                    align-items: center;
                    padding: 1rem;
                    background: rgba(13, 17, 23, 0.85);
                    backdrop-filter: blur(25px);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    position: sticky;
                    top: 0;
                    z-index: 100;
                }
                .bottom-nav {
                    display: none;
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 70px;
                    background: rgba(13, 17, 23, 0.95);
                    backdrop-filter: blur(20px);
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                    z-index: 1000;
                    justify-content: space-around;
                    align-items: center;
                    padding: 0 0.5rem;
                }
                .nav-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    color: rgba(255, 255, 255, 0.5);
                    font-size: 0.7rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    flex: 1;
                    padding: 8px 0;
                }
                .nav-item.active {
                    color: var(--primary-blue);
                }

                @media (max-width: 1024px) {
                    .admin-container {
                        grid-template-columns: 1fr;
                    }
                    .admin-sidebar {
                        display: none;
                    }
                    .lg-visible {
                        display: none;
                    }
                    .admin-main {
                        padding: 1.5rem 1rem 100px 1rem;
                        height: auto;
                        overflow-y: visible;
                    }
                    .mobile-header {
                        display: flex;
                    }
                    .bottom-nav {
                        display: flex;
                    }
                    .request-item-header {
                        flex-direction: column;
                        align-items: flex-start !important;
                        gap: 0.75rem !important;
                    }
                    .request-item-actions {
                        width: 100%;
                        justify-content: flex-start;
                        gap: 0.5rem !important;
                    }
                    .request-item-actions > * {
                        flex: 1;
                    }
                }
            `}</style>

            <div className="mobile-header">
                <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '1px' }}>GRAPHÈNE Admin</h2>
            </div>

            <nav className="bottom-nav">
                <div className={`nav-item ${view === 'active' ? 'active' : ''}`} onClick={() => setView('active')}>
                    <MessageCircle size={22} />
                    <span>Orçamentos</span>
                </div>
                <div className={`nav-item ${view === 'products' ? 'active' : ''}`} onClick={() => setView('products')}>
                    <Package size={22} />
                    <span>Produtos</span>
                </div>
                <div className={`nav-item ${view === 'admins' ? 'active' : ''}`} onClick={() => setView('admins')}>
                    <Users size={22} />
                    <span>Time</span>
                </div>
                <div className={`nav-item ${view === 'trash' ? 'active' : ''}`} onClick={() => setView('trash')}>
                    <Trash2 size={22} />
                    <span>Lixeira</span>
                </div>
                <div className="nav-item" onClick={handleLogout}>
                    <LogOut size={22} />
                    <span>Sair</span>
                </div>
            </nav>

            {/* Sidebar */}
            <aside className={`glass admin-sidebar ${expandedId === 'mobile-menu' ? 'open' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>GRAPHÈNE</h2>
                    <Button variant="glass" className="lg-hidden" onClick={() => setExpandedId(null)} style={{ padding: '5px' }}>
                        <X size={20} />
                    </Button>
                </div>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                    <Button
                        variant={view === 'active' ? 'primary' : 'glass'}
                        style={{ justifyContent: 'flex-start', width: '100%' }}
                        onClick={() => { setView('active'); setExpandedId(null); }}
                    >
                        <MessageCircle size={18} /> Solicitações
                    </Button>
                    <Button
                        variant={view === 'products' ? 'primary' : 'glass'}
                        style={{ justifyContent: 'flex-start', width: '100%' }}
                        onClick={() => { setView('products'); setExpandedId(null); }}
                    >
                        <Package size={18} /> Produtos
                    </Button>
                    <Button
                        variant={view === 'admins' ? 'primary' : 'glass'}
                        style={{ justifyContent: 'flex-start', width: '100%' }}
                        onClick={() => { setView('admins'); setExpandedId(null); }}
                    >
                        <Shield size={18} /> Admins
                    </Button>
                    <Button
                        variant={view === 'trash' ? 'primary' : 'glass'}
                        style={{ justifyContent: 'flex-start', width: '100%' }}
                        onClick={() => { setView('trash'); setExpandedId(null); }}
                    >
                        <Trash2 size={18} /> Lixeira
                    </Button>
                </nav>
                <Button variant="outline" onClick={handleLogout} style={{ justifyContent: 'flex-start', width: '100%' }}><LogOut size={18} /> Sair</Button>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                <Toaster position="top-right" richColors />
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {view === 'trash' && (
                            <Button variant="glass" onClick={() => setView('active')} style={{ padding: '10px', borderRadius: '50%' }}>
                                <ArrowLeft size={24} />
                            </Button>
                        )}
                        <h1 className="text-gradient" style={{ fontSize: 'clamp(1.2rem, 6vw, 2.5rem)', fontWeight: '800', letterSpacing: '-0.02em', WebkitTextStroke: '0px' }}>
                            {view === 'active' ? 'Solicitações' : view === 'products' ? 'Gerenciar Produtos' : view === 'admins' ? 'Gerenciar Admins' : 'Lixeira'}
                        </h1>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Button variant="outline" onClick={() => window.location.href = '/'} style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            🌐 Ver Site
                        </Button>
                        <span className="lg-visible" style={{ opacity: 0.4, fontSize: '0.85rem', fontWeight: '500' }}>ADMIN PANEL</span>
                    </div>
                </header>

                {view === 'products' ? (
                    <AdminProducts />
                ) : view === 'admins' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
                        <Card title="Adicionar Novo Administrador">
                            <form onSubmit={handleAddAdmin} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
                                <div style={{ flex: '1 1 100%' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Usuário</label>
                                    <input type="text" value={newAdminUser} onChange={e => setNewAdminUser(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none' }} />
                                </div>
                                <div style={{ flex: '1 1 100%' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Senha</label>
                                    <input type="text" value={newAdminPass} onChange={e => setNewAdminPass(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none' }} />
                                </div>
                                <Button type="submit" variant="primary" style={{ flex: '1 1 100%', justifyContent: 'center', marginTop: '1rem' }}>Adicionar</Button>
                            </form>
                        </Card>

                        <Card title="Administradores Existentes">
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
                        <Card title={view === 'active' ? 'Novas Solicitações' : 'Itens Excluídos'}>
                            <ul style={{ listStyle: 'none' }}>
                                {requests.length === 0 ? (
                                    <p style={{ padding: '1rem', opacity: 0.7 }}>
                                        {view === 'active' ? 'Nenhuma solicitação encontrada.' : 'Lixeira vazia.'}
                                    </p>
                                ) : (
                                    requests.map(req => (
                                        <li key={req.id} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0.5rem 0' }}>
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
            </main>
        </div >
    );
};

export default Admin;
