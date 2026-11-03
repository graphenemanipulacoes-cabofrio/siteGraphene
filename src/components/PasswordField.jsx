import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import '../styles/password-field.css';

// Campo de senha com botão para mostrar ou ocultar o que foi digitado.
const PasswordField = ({ className, ...inputProps }) => {
    const [visible, setVisible] = useState(false);
    const label = visible ? 'Ocultar senha' : 'Mostrar senha';
    return <span className="password-field">
        <input {...inputProps} className={className ? `password-input ${className}` : 'password-input'} type={visible ? 'text' : 'password'} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
        <button type="button" className="password-toggle" onClick={() => setVisible(current => !current)} aria-label={label} aria-pressed={visible} title={label}>
            {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
    </span>;
};

export default PasswordField;
