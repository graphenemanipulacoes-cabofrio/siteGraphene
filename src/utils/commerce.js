export const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function validCpf(value) {
    const digits = value.replace(/\D/g, '');
    if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;
    return [9, 10].every(length => {
        const sum = [...digits.slice(0, length)].reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
        const remainder = (sum * 10) % 11;
        return (remainder === 10 ? 0 : remainder) === Number(digits[length]);
    });
}
