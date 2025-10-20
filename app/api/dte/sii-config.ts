export const SII_CONFIG = {
    // URLs de certificación (funcionan)
    CERTIFICACION: {
        SEED_URL: 'https://maullin.sii.cl/cgi_dte/UPL/GetTokenFromSeed',
        TOKEN_URL: 'https://maullin.sii.cl/cgi_dte/UPL/GetTokenFromSeed',
        UPLOAD_URL: 'https://maullin.sii.cl/cgi_dte/UPL/DTEUpload',
        QUERY_URL: 'https://maullin.sii.cl/cgi_dte/UPL/DTEUpload'
    },
    
    // URLs de producción (actualizadas 2024)
    PRODUCCION: {
        SEED_URL: 'https://www4.sii.cl/cgi_dte/UPL/GetTokenFromSeed',
        TOKEN_URL: 'https://www4.sii.cl/cgi_dte/UPL/GetTokenFromSeed', 
        UPLOAD_URL: 'https://www4.sii.cl/cgi_dte/UPL/DTEUpload',
        QUERY_URL: 'https://www4.sii.cl/cgi_dte/UPL/DTEUpload'
    },
    
    // Configuración actual - usar CERTIFICACION para pruebas
    AMBIENTE: (process.env.SII_AMBIENTE as 'CERTIFICACION' | 'PRODUCCION') || 'CERTIFICACION',
    
    // Timeouts y reintentos
    TIMEOUT_MS: parseInt(process.env.SII_TIMEOUT_MS || '15000'), // 15 segundos
    MAX_REINTENTOS: parseInt(process.env.SII_MAX_REINTENTOS || '3'),
    DELAY_ENTRE_CONSULTAS: 30000, // 30 segundos
    MAX_TIEMPO_ESPERA: 300000 // 5 minutos
};

export const getCurrentConfig = () => {
    return SII_CONFIG[SII_CONFIG.AMBIENTE];
};