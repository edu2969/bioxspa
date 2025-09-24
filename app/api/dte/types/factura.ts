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
  afecto: boolean; // true = afecto, false = exento
}

export interface FacturaElectronica {
  tipoDTE: 33 | 34 | 52 | 56 | 61; // 33=Factura, 34=Exenta, 52=Guía, 56=Nota Débito, 61=Nota Crédito
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
    tipo: 'P' | 'M'; // P=Porcentaje, M=Monto
    valor: number;
    sobreAfectos: boolean;
  };
  referencia?: {
    nroLinRef: number;
    tipoDTE: number;
    folio: number;
    fechaDocRef: string;
    codRef: number; // 1=Anula, 2=Corrige texto, 3=Corrige montos
    razonRef: string;
  };
}
