const Card = ({ children, className = '', title, gradient = false }) => {
    return (
        <div className={`glass-card ${className}`} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {title && (
                <h3 style={{
                    fontSize: '1.25rem',
                    marginBottom: '1rem',
                    color: gradient ? 'transparent' : 'white',
                    background: gradient ? 'var(--gradient-text)' : 'none',
                    WebkitBackgroundClip: gradient ? 'text' : 'none',
                    backgroundClip: gradient ? 'text' : 'none'
                }}>
                    {title}
                </h3>
            )}
            <div style={{ flex: 1 }}>{children}</div>
        </div>
    );
};

export default Card;
