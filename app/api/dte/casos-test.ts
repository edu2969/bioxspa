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
    tipo: 'P' | 'M'; // P = Porcentaje, M = Monto
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
  motivoTraslado?: string;
}

// Constantes para tipos de DTE
export const TIPOS_DTE = {
  FACTURA_ELECTRONICA: 33,
  FACTURA_EXENTA: 34,
  NOTA_DEBITO: 56,
  NOTA_CREDITO: 61,
  GUIA_DESPACHO: 52
} as const;

// Constantes para códigos de referencia
export const CODIGOS_REFERENCIA = {
  ANULA_DOC_REFERENCIA: 1,
  CORRIGE_TEXTO: 2,
  CORRIGE_MONTOS: 3
} as const;

// Receptor estándar para certificación SII
const RECEPTOR_SII = {
  rut: "96790240-3",
  razonSocial: "SERVICIO DE IMPUESTOS INTERNOS",
  giro: "ADMINISTRACION PUBLICA",
  direccion: "TEATINOS 120",
  comuna: "SANTIAGO",
  ciudad: "SANTIAGO"
};

// Emisor para traslados internos (debe coincidir con emisor)
const EMISOR_COMO_RECEPTOR = {
  rut: process.env.EMISOR_RUT?.split('-')[0] + "-" + process.env.EMISOR_RUT?.split('-')[1] || "12345678-9",
  razonSocial: process.env.RAZON_SOCIAL_EMPRESA || "BIOXSPA LTDA",
  giro: "COMERCIO DE GASES INDUSTRIALES",
  direccion: "DIRECCION EMPRESA",
  comuna: "COMUNA EMPRESA", 
  ciudad: "CIUDAD EMPRESA"
};

export const CASOS_TEST: Record<string, DTETest> = {
  // =============================================================
  // SET BASICO - NUMERO DE ATENCION: 4444651
  // =============================================================
  
  "4444651-1": {
    tipoDTE: TIPOS_DTE.FACTURA_ELECTRONICA,
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
  },

  "4444651-2": {
    tipoDTE: TIPOS_DTE.FACTURA_ELECTRONICA,
    folio: 2,
    fechaEmision: "2024-01-16",
    receptor: RECEPTOR_SII,
    items: [
      {
        nroLinDet: 1,
        nombre: "Pañuelo AFECTO",
        cantidad: 331,
        precioUnitario: 2653,
        descuentoPct: 5,
        montoItem: Math.round(331 * 2653 * 0.95), // Aplicar descuento 5%
        afecto: true
      },
      {
        nroLinDet: 2,
        nombre: "ITEM 2 AFECTO",
        cantidad: 261,
        precioUnitario: 1715,
        descuentoPct: 8,
        montoItem: Math.round(261 * 1715 * 0.92), // Aplicar descuento 8%
        afecto: true
      }
    ]
  },

  "4444651-3": {
    tipoDTE: TIPOS_DTE.FACTURA_ELECTRONICA,
    folio: 3,
    fechaEmision: "2024-01-17",
    receptor: RECEPTOR_SII,
    items: [
      {
        nroLinDet: 1,
        nombre: "Pintura B&W AFECTO",
        cantidad: 28,
        precioUnitario: 2928,
        montoItem: 28 * 2928,
        afecto: true
      },
      {
        nroLinDet: 2,
        nombre: "ITEM 2 AFECTO",
        cantidad: 165,
        precioUnitario: 3106,
        montoItem: 165 * 3106,
        afecto: true
      },
      {
        nroLinDet: 3,
        nombre: "ITEM 3 SERVICIO EXENTO",
        cantidad: 1,
        precioUnitario: 34813,
        montoItem: 1 * 34813,
        afecto: false
      }
    ]
  },

  "4444651-4": {
    tipoDTE: TIPOS_DTE.FACTURA_ELECTRONICA,
    folio: 4,
    fechaEmision: "2024-01-18",
    receptor: RECEPTOR_SII,
    items: [
      {
        nroLinDet: 1,
        nombre: "ITEM 1 AFECTO",
        cantidad: 142,
        precioUnitario: 2454,
        montoItem: 142 * 2454,
        afecto: true
      },
      {
        nroLinDet: 2,
        nombre: "ITEM 2 AFECTO",
        cantidad: 61,
        precioUnitario: 2473,
        montoItem: 61 * 2473,
        afecto: true
      },
      {
        nroLinDet: 3,
        nombre: "ITEM 3 SERVICIO EXENTO",
        cantidad: 2,
        precioUnitario: 6779,
        montoItem: 2 * 6779,
        afecto: false
      }
    ],
    descuentoGlobal: {
      tipo: 'P',
      valor: 9, // 9% descuento sobre afectos
      sobreAfectos: true
    }
  },

  "4444651-5": {
    tipoDTE: TIPOS_DTE.NOTA_CREDITO,
    folio: 5,
    fechaEmision: "2024-01-19",
    receptor: RECEPTOR_SII,
    items: [], // Nota de crédito que corrige giro, sin items
    referencia: {
      nroLinRef: 1,
      tipoDTE: TIPOS_DTE.FACTURA_ELECTRONICA,
      folio: 1,
      fechaDocRef: "2024-01-15",
      codRef: CODIGOS_REFERENCIA.CORRIGE_TEXTO,
      razonRef: "CORRIGE GIRO DEL RECEPTOR"
    }
  },

  "4444651-6": {
    tipoDTE: TIPOS_DTE.NOTA_CREDITO,
    folio: 6,
    fechaEmision: "2024-01-20",
    receptor: RECEPTOR_SII,
    items: [
      {
        nroLinDet: 1,
        nombre: "Pañuelo AFECTO",
        cantidad: 122,
        precioUnitario: 2653,
        descuentoPct: 5, // Mantener descuento original
        montoItem: Math.round(122 * 2653 * 0.95),
        afecto: true
      },
      {
        nroLinDet: 2,
        nombre: "ITEM 2 AFECTO",
        cantidad: 177,
        precioUnitario: 1715,
        descuentoPct: 8, // Mantener descuento original
        montoItem: Math.round(177 * 1715 * 0.92),
        afecto: true
      }
    ],
    referencia: {
      nroLinRef: 1,
      tipoDTE: TIPOS_DTE.FACTURA_ELECTRONICA,
      folio: 2,
      fechaDocRef: "2024-01-16",
      codRef: CODIGOS_REFERENCIA.CORRIGE_MONTOS,
      razonRef: "DEVOLUCION DE MERCADERIAS"
    }
  },

  "4444651-7": {
    tipoDTE: TIPOS_DTE.NOTA_CREDITO,
    folio: 7,
    fechaEmision: "2024-01-21",
    receptor: RECEPTOR_SII,
    items: [
      {
        nroLinDet: 1,
        nombre: "Pintura B&W AFECTO",
        cantidad: 28,
        precioUnitario: 2928,
        montoItem: 28 * 2928,
        afecto: true
      },
      {
        nroLinDet: 2,
        nombre: "ITEM 2 AFECTO",
        cantidad: 165,
        precioUnitario: 3106,
        montoItem: 165 * 3106,
        afecto: true
      },
      {
        nroLinDet: 3,
        nombre: "ITEM 3 SERVICIO EXENTO",
        cantidad: 1,
        precioUnitario: 34813,
        montoItem: 1 * 34813,
        afecto: false
      }
    ],
    referencia: {
      nroLinRef: 1,
      tipoDTE: TIPOS_DTE.FACTURA_ELECTRONICA,
      folio: 3,
      fechaDocRef: "2024-01-17",
      codRef: CODIGOS_REFERENCIA.ANULA_DOC_REFERENCIA,
      razonRef: "ANULA FACTURA"
    }
  },

  "4444651-8": {
    tipoDTE: TIPOS_DTE.NOTA_DEBITO,
    folio: 8,
    fechaEmision: "2024-01-22",
    receptor: RECEPTOR_SII,
    items: [], // Anula nota de crédito, sin items
    referencia: {
      nroLinRef: 1,
      tipoDTE: TIPOS_DTE.NOTA_CREDITO,
      folio: 5,
      fechaDocRef: "2024-01-19",
      codRef: CODIGOS_REFERENCIA.ANULA_DOC_REFERENCIA,
      razonRef: "ANULA NOTA DE CREDITO ELECTRONICA"
    }
  },

  // =============================================================
  // SET GUIA DE DESPACHO - NUMERO DE ATENCION: 4444652
  // =============================================================

  "4444652-1": {
    tipoDTE: TIPOS_DTE.GUIA_DESPACHO,
    folio: 101,
    fechaEmision: "2024-01-23",
    receptor: EMISOR_COMO_RECEPTOR, // Traslado interno: receptor = emisor
    items: [
      {
        nroLinDet: 1,
        nombre: "ITEM 1",
        cantidad: 80,
        precioUnitario: 0, // Sin precio en traslado interno
        montoItem: 0,
        afecto: false
      },
      {
        nroLinDet: 2,
        nombre: "ITEM 2", 
        cantidad: 129,
        precioUnitario: 0,
        montoItem: 0,
        afecto: false
      },
      {
        nroLinDet: 3,
        nombre: "ITEM 3",
        cantidad: 89,
        precioUnitario: 0,
        montoItem: 0,
        afecto: false
      }
    ],
    tipoTraslado: 1, // Traslado interno
    transportista: 'EMISOR',
    motivoTraslado: "TRASLADO DE MATERIALES ENTRE BODEGAS DE LA EMPRESA"
  },

  "4444652-2": {
    tipoDTE: TIPOS_DTE.GUIA_DESPACHO,
    folio: 102,
    fechaEmision: "2024-01-24",
    receptor: RECEPTOR_SII,
    items: [
      {
        nroLinDet: 1,
        nombre: "ITEM 1",
        cantidad: 369,
        precioUnitario: 7517,
        montoItem: 369 * 7517,
        afecto: true
      },
      {
        nroLinDet: 2,
        nombre: "ITEM 2",
        cantidad: 715,
        precioUnitario: 1683,
        montoItem: 715 * 1683,
        afecto: true
      }
    ],
    tipoTraslado: 2, // Venta
    transportista: 'EMISOR',
    motivoTraslado: "VENTA - TRASLADO POR EMISOR DEL DOCUMENTO AL LOCAL DEL CLIENTE"
  },

  "4444652-3": {
    tipoDTE: TIPOS_DTE.GUIA_DESPACHO,
    folio: 103,
    fechaEmision: "2024-01-25",
    receptor: RECEPTOR_SII,
    items: [
      {
        nroLinDet: 1,
        nombre: "ITEM 1",
        cantidad: 176,
        precioUnitario: 2025,
        montoItem: 176 * 2025,
        afecto: true
      },
      {
        nroLinDet: 2,
        nombre: "ITEM 2",
        cantidad: 440,
        precioUnitario: 5870,
        montoItem: 440 * 5870,
        afecto: true
      }
    ],
    tipoTraslado: 2, // Venta
    transportista: 'RECEPTOR',
    motivoTraslado: "VENTA - TRASLADO POR CLIENTE"
  },

  // =============================================================
  // SET FACTURA EXENTA - NUMERO DE ATENCION: 4444653
  // =============================================================

  "4444653-1": {
    tipoDTE: TIPOS_DTE.FACTURA_EXENTA,
    folio: 201,
    fechaEmision: "2024-01-26",
    receptor: RECEPTOR_SII,
    items: [
      {
        nroLinDet: 1,
        nombre: "HORAS PROGRAMADOR",
        cantidad: 15,
        unidadMedida: "Hora",
        precioUnitario: 8526,
        montoItem: 15 * 8526,
        afecto: false // Factura exenta
      }
    ]
  },

  "4444653-2": {
    tipoDTE: TIPOS_DTE.NOTA_CREDITO,
    folio: 202,
    fechaEmision: "2024-01-27",
    receptor: RECEPTOR_SII,
    items: [
      {
        nroLinDet: 1,
        nombre: "HORAS PROGRAMADOR",
        cantidad: 1,
        unidadMedida: "Hora",
        precioUnitario: 1066, // Monto de corrección
        montoItem: 1066,
        afecto: false
      }
    ],
    referencia: {
      nroLinRef: 1,
      tipoDTE: TIPOS_DTE.FACTURA_EXENTA,
      folio: 201,
      fechaDocRef: "2024-01-26",
      codRef: CODIGOS_REFERENCIA.CORRIGE_MONTOS,
      razonRef: "MODIFICA MONTO"
    }
  },

  "4444653-3": {
    tipoDTE: TIPOS_DTE.FACTURA_EXENTA,
    folio: 203,
    fechaEmision: "2024-01-28",
    receptor: RECEPTOR_SII,
    items: [
      {
        nroLinDet: 1,
        nombre: "SERV CONSULTORIA FACT ELECTRONICA",
        cantidad: 1,
        precioUnitario: 422952,
        montoItem: 422952,
        afecto: false
      },
      {
        nroLinDet: 2,
        nombre: "SERV CONSULTORIA GUIA DESPACHO ELECT",
        cantidad: 1,
        precioUnitario: 284827,
        montoItem: 284827,
        afecto: false
      }
    ]
  },

  "4444653-4": {
    tipoDTE: TIPOS_DTE.NOTA_CREDITO,
    folio: 204,
    fechaEmision: "2024-01-29",
    receptor: RECEPTOR_SII,
    items: [], // Corrige giro, sin items
    referencia: {
      nroLinRef: 1,
      tipoDTE: TIPOS_DTE.FACTURA_EXENTA,
      folio: 203,
      fechaDocRef: "2024-01-28",
      codRef: CODIGOS_REFERENCIA.CORRIGE_TEXTO,
      razonRef: "CORRIGE GIRO"
    }
  },

  "4444653-5": {
    tipoDTE: TIPOS_DTE.NOTA_DEBITO,
    folio: 205,
    fechaEmision: "2024-01-30",
    receptor: RECEPTOR_SII,
    items: [], // Anula nota de crédito, sin items
    referencia: {
      nroLinRef: 1,
      tipoDTE: TIPOS_DTE.NOTA_CREDITO,
      folio: 204,
      fechaDocRef: "2024-01-29",
      codRef: CODIGOS_REFERENCIA.ANULA_DOC_REFERENCIA,
      razonRef: "ANULA NOTA DE CREDITO ELECTRONICA"
    }
  },

  "4444653-6": {
    tipoDTE: TIPOS_DTE.FACTURA_EXENTA,
    folio: 206,
    fechaEmision: "2024-01-31",
    receptor: RECEPTOR_SII,
    items: [
      {
        nroLinDet: 1,
        nombre: "CAPACITACION USO CIGUEÑALES",
        cantidad: 1,
        precioUnitario: 377256,
        montoItem: 377256,
        afecto: false
      },
      {
        nroLinDet: 2,
        nombre: "CAPACITACION USO PLC's CNC",
        cantidad: 1,
        precioUnitario: 263118,
        montoItem: 263118,
        afecto: false
      }
    ]
  },

  "4444653-7": {
    tipoDTE: TIPOS_DTE.NOTA_CREDITO,
    folio: 207,
    fechaEmision: "2024-02-01",
    receptor: RECEPTOR_SII,
    items: [
      {
        nroLinDet: 1,
        nombre: "CAPACITACION USO CIGUEÑALES",
        cantidad: 1,
        precioUnitario: 188628, // Monto de corrección
        montoItem: 188628,
        afecto: false
      }
    ],
    referencia: {
      nroLinRef: 1,
      tipoDTE: TIPOS_DTE.FACTURA_EXENTA,
      folio: 206,
      fechaDocRef: "2024-01-31",
      codRef: CODIGOS_REFERENCIA.CORRIGE_MONTOS,
      razonRef: "MODIFICA MONTO"
    }
  },

  "4444653-8": {
    tipoDTE: TIPOS_DTE.NOTA_DEBITO,
    folio: 208,
    fechaEmision: "2024-02-02",
    receptor: RECEPTOR_SII,
    items: [
      {
        nroLinDet: 1,
        nombre: "CAPACITACION USO PLC's CNC",
        cantidad: 1,
        precioUnitario: 52624, // Monto de corrección adicional
        montoItem: 52624,
        afecto: false
      }
    ],
    referencia: {
      nroLinRef: 1,
      tipoDTE: TIPOS_DTE.FACTURA_EXENTA,
      folio: 206,
      fechaDocRef: "2024-01-31",
      codRef: CODIGOS_REFERENCIA.CORRIGE_MONTOS,
      razonRef: "MODIFICA MONTO"
    }
  }
};

// Función helper para obtener descripción del tipo de DTE
export function obtenerDescripcionTipoDTE(tipoDTE: number): string {
  const descripciones: Record<number, string> = {
    [TIPOS_DTE.FACTURA_ELECTRONICA]: "FACTURA ELECTRONICA",
    [TIPOS_DTE.FACTURA_EXENTA]: "FACTURA NO AFECTA O EXENTA ELECTRONICA",
    [TIPOS_DTE.NOTA_CREDITO]: "NOTA DE CREDITO ELECTRONICA",
    [TIPOS_DTE.NOTA_DEBITO]: "NOTA DE DEBITO ELECTRONICA",
    [TIPOS_DTE.GUIA_DESPACHO]: "GUIA DE DESPACHO ELECTRONICA"
  };
  return descripciones[tipoDTE] || `TIPO DTE ${tipoDTE}`;
}

// Función helper para formatear montos con separador de miles
export function formatearMonto(monto: number): string {
  return monto.toLocaleString('es-CL');
}

// Función helper para validar caso de test
export function validarCasoTest(caso: DTETest): string[] {
  const errores: string[] = [];
  
  if (!caso.tipoDTE || caso.tipoDTE <= 0) {
    errores.push("Tipo de DTE inválido");
  }
  
  if (!caso.folio || caso.folio <= 0) {
    errores.push("Folio inválido");
  }
  
  if (!caso.fechaEmision) {
    errores.push("Fecha de emisión requerida");
  }
  
  if (!caso.receptor?.rut) {
    errores.push("RUT del receptor requerido");
  }
  
  if (caso.items.length === 0 && !([TIPOS_DTE.NOTA_CREDITO, TIPOS_DTE.NOTA_DEBITO] as number[]).includes(caso.tipoDTE)) {
    errores.push("Factura y Guía de Despacho deben tener items");
  }
  
  return errores;
}

console.log(`✅ Casos de test SII cargados: ${Object.keys(CASOS_TEST).length} casos`);
console.log(`📋 Sets incluidos: 4444651 (Básico), 4444652 (Guías), 4444653 (Exentas)`);