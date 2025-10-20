export interface SIIResponse {
    trackId?: string;
    estado: 'RECIBIDO' | 'PROCESADO' | 'ACEPTADO' | 'RECHAZADO' | 'ERROR';
    errores?: string[];
    codigo?: string;
    descripcion?: string;
    glosas?: string[];
}

export interface DTEEnvio {
    rutEmpresa: string;
    dvEmpresa: string;
    archivo: string; // Base64
}

export interface ConsultaTrackID {
    trackId: string;
    empresa: string;
}

export interface ResultadoCertificacion {
    caso: string;
    trackId?: string;
    estado: string;
    exitoso: boolean;
    errores?: string[];
    error?: string;
    tiempoRespuesta?: number;
}

export interface TokenSII {
    token: string;
    expiracion: Date;
}

export interface SeedResponse {
    semilla: string;
    estado: string;
}