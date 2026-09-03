import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AtivosPage from './pages/AtivosPage';
import LaboratorioPage from './pages/LaboratorioPage';
import ReceitaPage from './pages/ReceitaPage';
import PrescritoresPage from './pages/PrescritoresPage';
import AvaliacoesPage from './pages/AvaliacoesPage';
import Login from './pages/Login';
import Admin from './pages/Admin';
import PartnerProgramPage from './pages/PartnerProgramPage';
import PartnerRegistration from './pages/PartnerRegistration';
import PartnerAccess from './pages/PartnerAccess';
import PartnerPortal from './pages/PartnerPortal';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import CustomerAccessPage from './pages/CustomerAccessPage';
import AccountPage from './pages/AccountPage';
import ProductPage from './pages/ProductPage';
import PaymentReturnPage from './pages/PaymentReturnPage';
import PasswordResetPage from './pages/PasswordResetPage';

function App() {
  return (
    <BrowserRouter>
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
