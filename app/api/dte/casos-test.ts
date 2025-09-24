export interface ItemDTE {
  nroLinDet: number;
  codItem?: string;
  nombre: string;
  cantidad: number;
  unidadMedida?: string;
  precioUnitario: number;
  descuentoPct?: number;
  descuentoMonto?: number;
  montoItem: number;
  afecto: boolean;
}

export interface DTETest {
  tipoDTE: number;
  folio: number;
  fechaEmision: string;
  receptor: {
    rut: string;
    razonSocial: string;
    giro: string;
    direccion: string;
    comuna: string;
    ciudad: string;
  };
  items: ItemDTE[];
  descuentoGlobal?: {
    tipo: 'P' | 'M';
    valor: number;
    sobreAfectos: boolean;
  };
  referencia?: {
    nroLinRef: number;
    tipoDTE: number;
    folio: number;
    fechaDocRef: string;
    codRef: number;
    razonRef: string;
  };
  tipoTraslado?: number;
  transportista?: 'EMISOR' | 'RECEPTOR' | 'TRANSPORTISTA';
}

const RECEPTOR_SII = {
  rut: "96790240-3",
  razonSocial: "SERVICIO DE IMPUESTOS INTERNOS",
  giro: "ADMINISTRACION PUBLICA",
  direccion: "TEATINOS 120",
  comuna: "SANTIAGO",
  ciudad: "SANTIAGO"
};

export const CASOS_TEST: Record<string, DTETest> = {
  "4444651-1": {
    tipoDTE: 33,
    folio: 1,
    fechaEmision: "2024-01-15",
    receptor: RECEPTOR_SII,
    items: [
      {
        nroLinDet: 1,
        nombre: "Cajón AFECTO",
        cantidad: 132,
        precioUnitario: 1396,
        montoItem: 132 * 1396,
        afecto: true
      },
      {
        nroLinDet: 2,
        nombre: "Relleno AFECTO",
        cantidad: 56,
        precioUnitario: 2273,
        montoItem: 56 * 2273,
        afecto: true
      }
    ]
  }
}