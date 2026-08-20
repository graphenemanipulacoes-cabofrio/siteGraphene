import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AtivosPage from './pages/AtivosPage';
import LaboratorioPage from './pages/LaboratorioPage';
import ReceitaPage from './pages/ReceitaPage';
import PrescritoresPage from './pages/PrescritoresPage';
import AvaliacoesPage from './pages/AvaliacoesPage';
import Login from './pages/Login';
import Admin from './pages/Admin';
import PartnerRegistration from './pages/PartnerRegistration';

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
        <Route path="/parceiros/cadastro" element={<PartnerRegistration />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
