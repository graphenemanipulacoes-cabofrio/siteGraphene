import { useState } from 'react';
import StoreLayout from '../components/StoreLayout';
import ProductGrid from '../components/ProductGrid';
import CouponBar from '../components/CouponBar';

// Todos os produtos em uma página só, com busca e categorias (/produtos?categoria=treino).
export default function ProductsPage() {
    const [searchTerm, setSearchTerm] = useState('');
    return <StoreLayout search searchTerm={searchTerm} onSearchChange={setSearchTerm}>
        <CouponBar />
        <ProductGrid variant="page" searchTerm={searchTerm} />
    </StoreLayout>;
}
