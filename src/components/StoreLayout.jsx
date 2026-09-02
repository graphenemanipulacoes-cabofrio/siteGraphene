import Header from './Header';
import Footer from './Footer';
import FloatingWhatsApp from './FloatingWhatsApp';

const StoreLayout = ({ children, search, searchTerm, onSearchChange }) => (
    <div className="page-root">
        <Header showSearch={search} searchTerm={searchTerm} onSearchChange={onSearchChange} />
        <main>{children}</main>
        <Footer />
        <FloatingWhatsApp />
    </div>
);

export default StoreLayout;
