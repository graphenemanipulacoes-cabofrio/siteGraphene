const Button = ({ children, variant = 'primary', onClick, className = '', style = {}, ...props }) => {
    const baseStyle = {
        padding: '14px 28px',
        borderRadius: '50px',
        fontWeight: '700',
        fontSize: '0.95rem',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        cursor: 'pointer',
        border: 'none',
        outline: 'none',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    };

    const variants = {
        primary: {
            background: 'var(--text-main)', /* Solid Dark Button */
            color: '#fff',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.2)',
        },
        accent: {
            background: 'var(--primary-blue)',
            color: '#fff',
            boxShadow: '0 10px 25px -5px rgba(14, 165, 233, 0.3)',
        },
        outline: {
            background: 'transparent',
            border: '2px solid var(--text-main)',
            color: 'var(--text-main)',
        },
        glass: {
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(15, 23, 42, 0.08)',
            color: 'var(--text-main)',
        }
    };

    return (
        <button
            onClick={onClick}
            className={className}
            style={{ ...baseStyle, ...variants[variant], ...style }}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
