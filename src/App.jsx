import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SeoManager from './components/SeoManager';
import PrivacyNotice from './components/PrivacyNotice';

const HomePage = lazy(() => import('./pages/HomePage'));
const AtivosPage = lazy(() => import('./pages/AtivosPage'));
const LaboratorioPage = lazy(() => import('./pages/LaboratorioPage'));
const ReceitaPage = lazy(() => import('./pages/ReceitaPage'));
const PrescritoresPage = lazy(() => import('./pages/PrescritoresPage'));
const AvaliacoesPage = lazy(() => import('./pages/AvaliacoesPage'));
const Login = lazy(() => import('./pages/Login'));
const Admin = lazy(() => import('./pages/Admin'));
const PartnerProgramPage = lazy(() => import('./pages/PartnerProgramPage'));
const PartnerRegistration = lazy(() => import('./pages/PartnerRegistration'));
const PartnerAccess = lazy(() => import('./pages/PartnerAccess'));
const PartnerPortal = lazy(() => import('./pages/PartnerPortal'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const CustomerAccessPage = lazy(() => import('./pages/CustomerAccessPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
const PaymentReturnPage = lazy(() => import('./pages/PaymentReturnPage'));
const PasswordResetPage = lazy(() => import('./pages/PasswordResetPage'));
const AboutPage = lazy(() => import('./pages/InstitutionalPages').then(module => ({ default: module.AboutPage })));
const PrivacyPage = lazy(() => import('./pages/InstitutionalPages').then(module => ({ default: module.PrivacyPage })));
const PurchaseInfoPage = lazy(() => import('./pages/InstitutionalPages').then(module => ({ default: module.PurchaseInfoPage })));

function App() {
  return (
    <BrowserRouter>
      <SeoManager />
      <PrivacyNotice />
      <Suspense fallback={<main role="status" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text-main)' }}>Carregando Graphène…</main>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/ativos" element={<AtivosPage />} />
          <Route path="/laboratorio" element={<LaboratorioPage />} />
          <Route path="/receita" element={<ReceitaPage />} />
          <Route path="/prescritores" element={<PrescritoresPage />} />
          <Route path="/avaliacoes" element={<AvaliacoesPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/parceiros" element={<PartnerProgramPage />} />
          <Route path="/parceiros/cadastro" element={<PartnerRegistration />} />
          <Route path="/parceiros/entrar" element={<PartnerAccess />} />
          <Route path="/parceiros/painel" element={<PartnerPortal />} />
          <Route path="/produto/:id" element={<ProductPage />} />
          <Route path="/carrinho" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/entrar" element={<CustomerAccessPage />} />
          <Route path="/minha-conta" element={<AccountPage />} />
          <Route path="/pedido/retorno" element={<PaymentReturnPage />} />
          <Route path="/redefinir-senha" element={<PasswordResetPage />} />
          <Route path="/sobre" element={<AboutPage />} />
          <Route path="/privacidade" element={<PrivacyPage />} />
          <Route path="/compras" element={<PurchaseInfoPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
