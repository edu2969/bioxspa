export const USER_ROLE = {
    neo: 0,
    manager: 1,
    cliente: 2,
    conductor: 4,
    supervisor: 8,
    supplier: 16,
}

export const TIPO_DEPENDENCIA = {
    sucursal: 1,
    bodega: 10,
    sucursal_bodega: 11,
    bodega_proveedor: 20,
}

export const TIPO_CARGO = {
    neo: 0,
    gerente: 1,
    cobranza: 2,
    encargado: 8,
    despacho: 16,
    conductor: 32,
    proveedor: 64  
}

export const TIPO_PRECIO = {
    mayorista: 1,
    minorista: 2
} 

export const TIPO_COMISION = {
    chofer: 1,
    retiro: 2, 
    entrega: 3,
    nuevoCliente: 4,
    puntoVenta: 8
}

export const TIPO_UNIDAD_COMISION = {
    porcentaje: 1, 
    monto: 2
}

export const TIPO_FORMATO_DOCUMENTO_TRIBUTARIO = {
    p: 1,
    e: 2
}

export const TIPO_OPERACION_DOCUMENTO_TRIBUTARIO = {
    ninguna: 0,
    suma: 1,
    resta: 2
}

export const TIPO_ESTADO_VENTA = {
    borrador: 0,
    cotizacion: 1,
    ot: 2,
    preparacion: 4,
    reparto: 8,
    entregado: 16,
    rechazado: 32,
    anulado: 33,
    pagado: 64,
}
