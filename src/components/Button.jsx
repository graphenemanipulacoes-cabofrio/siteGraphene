const Button = ({ children, variant = 'primary', onClick, className = '', style = {}, ...props }) => {
    const baseStyle = {
        padding: '12px 24px',
        borderRadius: '50px',
        fontWeight: '600',
        fontSize: '1rem',
        transition: 'all 0.3s ease',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        border: 'none',
        outline: 'none',
    };

    const variants = {
        primary: {
            background: 'var(--primary-blue)',
            color: '#000',
            boxShadow: '0 0 15px var(--primary-blue-glow)',
        },
        outline: {
            background: 'transparent',
            border: '1px solid var(--primary-blue)',
            color: 'var(--primary-blue)',
        },
        glass: {
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#fff',
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
