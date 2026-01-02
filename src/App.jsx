import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Admin from './pages/Admin';
import PartnerRegistration from './pages/PartnerRegistration';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/parceiros/cadastro" element={<PartnerRegistration />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
