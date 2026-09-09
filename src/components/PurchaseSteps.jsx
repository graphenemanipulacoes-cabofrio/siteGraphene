export default function PurchaseSteps({ current }) {
    return <ol className="purchase-steps" aria-label="Etapas da compra">{['Carrinho', 'Entrega', 'Revisão e pagamento'].map((label, index) => <li key={label} className={index + 1 <= current ? 'is-current' : ''} aria-current={index + 1 === current ? 'step' : undefined}><span>{index + 1}</span>{label}</li>)}</ol>;
}
