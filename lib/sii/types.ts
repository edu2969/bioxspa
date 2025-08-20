export type Rut = { rut: string; dv: string };
export type EmisionInput = {
  emisor: Rut;          // RUT del contribuyente (empresa de tu cliente)
  sender: Rut;          // RUT que envía (tu RUT si el contribuyente te otorgó privilegios)
  caf: string;          // XML CAF (como string) correspondiente al folio a usar
  pfxBase64: string;    // Certificado PFX del EMISOR (base64)
  pfxPass: string;      // Clave del PFX
  documento: {
    folio: number;
    fechaEmision: string; // YYYY-MM-DD
    receptor: { rut: Rut; razon: string; giro?: string; direccion?: string; comuna?: string };
    items: Array<{ nombre: string; cantidad: number; precio: number; descuentoPct?: number }>; // netos
    referencias?: Array<{ tipoDoc: number; folio: number; fecha: string; razon?: string }>
  };
};

export type SiiEnv = 'CERT' | 'PROD';

export type SiiEndpoints = {
  getSeed: string;
  getToken: string;
  dteUpload: string;
  queryEstUp: string;
  queryEstDte: string;
  queryEstDteAv: string;
};

export const SII_ENDPOINTS: Record<SiiEnv, SiiEndpoints> = {
  CERT: {
    getSeed: 'https://maullin.sii.cl/DTEWS/CrSeed.jws',
    getToken: 'https://maullin.sii.cl/DTEWS/GetTokenFromSeed.jws',
    dteUpload: 'https://maullin.sii.cl/cgi_dte/UPL/DTEUpload',
    queryEstUp: 'https://maullin.sii.cl/DTEWS/QueryEstUp.jws',
    queryEstDte: 'https://maullin.sii.cl/DTEWS/QueryEstDte.jws',
    queryEstDteAv: 'https://maullin.sii.cl/DTEWS/services/QueryEstDteAv',
  },
  PROD: {
    getSeed: 'https://palena.sii.cl/DTEWS/CrSeed.jws',
    getToken: 'https://palena.sii.cl/DTEWS/GetTokenFromSeed.jws',
    dteUpload: 'https://palena.sii.cl/cgi_dte/UPL/DTEUpload',
    queryEstUp: 'https://palena.sii.cl/DTEWS/QueryEstUp.jws',
    queryEstDte: 'https://palena.sii.cl/DTEWS/QueryEstDte.jws',
    queryEstDteAv: 'https://palena.sii.cl/DTEWS/services/QueryEstDteAv',
  },
};