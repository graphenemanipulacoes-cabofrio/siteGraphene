const Card = ({ children, className = '', title, gradient = false }) => {
    return (
        <div className={`glass-card ${className}`} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {title && (
                <h3 style={{
                    fontSize: '1.5rem',
                    marginBottom: '1rem',
                    color: 'var(--text-main)',
                    fontWeight: '800',
                    textAlign: 'center',
                    letterSpacing: '-0.5px'
                }}>
                    {title}
                </h3>
            )}
            <div style={{ flex: 1 }}>{children}</div>
        </div>
    );
};

export default Card;
