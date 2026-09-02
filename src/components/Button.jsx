const Button = ({ children, variant = 'primary', size = 'md', onClick, className = '', style = {}, disabled = false, type, ...props }) => {
    const sizeStyles = {
        sm: { padding: '9px 20px', fontSize: '0.85rem' },
        md: { padding: '12px 28px', fontSize: '0.95rem' },
        lg: { padding: '16px 36px', fontSize: '1.05rem' },
        xl: { padding: '20px 48px', fontSize: '1.15rem' },
    };

    const baseStyle = {
        fontWeight: '700',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        borderRadius: '100px',
        border: 'none',
        outline: 'none',
        letterSpacing: '0.3px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        position: 'relative',
        overflow: 'hidden',
        ...sizeStyles[size],
        ...style
    };

    const variants = {
        primary: {
            background: 'var(--gradient-primary)',
            color: 'var(--action-ink)',
            boxShadow: '0 4px 14px rgba(14, 165, 233, 0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
        },
        secondary: {
            background: 'var(--gradient-secondary)',
            color: '#ffffff',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
        },
        accent: {
            background: 'var(--gradient-accent)',
            color: '#fff',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
        },
        outline: {
            background: 'rgba(34, 199, 232, 0.06)',
            border: '1.5px solid var(--border-blue)',
            color: 'var(--brand-blue)',
            boxShadow: 'none',
        },
        ghost: {
            background: 'transparent',
            color: 'var(--text-secondary)',
            boxShadow: 'none',
        },
        glass: {
            background: 'rgba(255, 255, 255, 0.06)',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--border-card)',
            color: 'var(--text-main)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
        },
        dark: {
            background: 'var(--gradient-dark)',
            color: '#fff',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
        },
    };

    // Hover effect via pseudo-element simulation
    const onHover = (e) => {
        if (!disabled) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            if (variant === 'primary') {
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(14, 165, 233, 0.35), inset 0 1px 0 rgba(255,255,255,0.25)';
            } else if (variant === 'outline') {
                e.currentTarget.style.background = 'rgba(34, 199, 232, 0.13)';
            } else if (variant === 'ghost') {
                e.currentTarget.style.background = 'var(--neutral-100)';
                e.currentTarget.style.color = 'var(--text-main)';
            }
        }
    };

    const onLeave = (e) => {
        if (!disabled) {
            e.currentTarget.style.transform = 'translateY(0)';
            if (variant === 'primary') {
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(14, 165, 233, 0.2), inset 0 1px 0 rgba(255,255,255,0.15)';
            } else if (variant === 'outline') {
                e.currentTarget.style.background = 'rgba(34, 199, 232, 0.06)';
            } else if (variant === 'ghost') {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
            }
        }
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={className}
            style={baseStyle}
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
