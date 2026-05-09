/**
 * Limpia el RUT removiendo puntos, guiones y espacios
 * @param {string} rut 
 * @returns {string}
 */
export function cleanRut(rut) {
    return rut.replace(/[^0-9kK]/g, '');
}

/**
 * Valida si el RUT tiene el formato correcto (sin validar dígito verificador)
 * @param {string} rut 
 * @returns {boolean}
 */
export function isValidRutFormat(rut) {
    const cleaned = cleanRut(rut);
    if (cleaned.length < 2 || cleaned.length > 9) return false;

    const numero = cleaned.slice(0, -1);
    const dv = cleaned.slice(-1).toUpperCase();

    // El número debe ser solo dígitos
    if (!/^\d+$/.test(numero)) return false;

    // El dígito verificador debe ser número o K
    if (!/^[0-9K]$/.test(dv)) return false;

    // Validar dígito verificador usando la fórmula chilena
    let sum = 0, mul = 2;
    for (let i = numero.length - 1; i >= 0; i--) {
        sum += parseInt(numero[i], 10) * mul;
        mul = mul === 7 ? 2 : mul + 1;
    }
    const expectedDv = 11 - (sum % 11);
    let dvCalc = '';
    if (expectedDv === 11) dvCalc = '0';
    else if (expectedDv === 10) dvCalc = 'K';
    else dvCalc = expectedDv.toString();

    return dv === dvCalc;
}

/**
 * Formatea el RUT con puntos de miles y guión
 * @param {string} rut 
 * @returns {string}
 */
export function formatRut(rut) {
    const cleaned = cleanRut(rut);
    
    if (cleaned.length === 0) return '';
    if (cleaned.length === 1) return cleaned;
    
    // Separar número del dígito verificador
    const numero = cleaned.slice(0, -1);
    const dv = cleaned.slice(-1).toUpperCase();
    
    // Formatear número con puntos de miles
    const numeroFormateado = numero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    return `${numeroFormateado}-${dv}`;
}

/**
 * Maneja el input del RUT con formateo automático
 * @param {string} value - Valor actual del input
 * @param {string} newValue - Nuevo valor ingresado
 * @returns {string} - Valor formateado
 */
export function handleRutInput(newValue) {
    // Limpiar y limitar a 9 caracteres (8 dígitos + 1 DV)
    const cleaned = cleanRut(newValue);
    if (cleaned.length > 9) return formatRut(cleaned.slice(0, 9));
    
    return formatRut(cleaned);
}