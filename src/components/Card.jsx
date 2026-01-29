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
                    letterSpacing: '-0.5px',
                    minHeight: '3.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: '1.2'
                }}>
                    {title}
                </h3>
            )}
            <div style={{ flex: 1 }}>{children}</div>
        </div>
    );
};

export default Card;
