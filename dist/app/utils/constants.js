"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIPO_CATEGORIA_CATALOGO = exports.TIPO_ESTADO_RUTA_DESPACHO = exports.TIPO_ESTADO_VENTA = exports.TIPO_OPERACION_DOCUMENTO_TRIBUTARIO = exports.TIPO_FORMATO_DOCUMENTO_TRIBUTARIO = exports.TIPO_UNIDAD_COMISION = exports.TIPO_COMISION = exports.TIPO_PRECIO = exports.TIPO_CARGO = exports.TIPO_DEPENDENCIA = exports.USER_ROLE = void 0;
exports.USER_ROLE = {
    neo: 2969,
    manager: 1,
    cliente: 2,
    seller: 3,
    conductor: 4,
    supervisor: 8,
    supplier: 16,
};
exports.TIPO_DEPENDENCIA = {
    sucursal: 1,
    bodega: 10,
    sucursal_bodega: 11,
    bodega_proveedor: 20,
};
exports.TIPO_CARGO = {
    neo: 2969,
    gerente: 1,
    cobranza: 2,
    encargado: 8,
    despacho: 16,
    conductor: 32,
    proveedor: 64
};
exports.TIPO_PRECIO = {
    mayorista: 1,
    minorista: 2
};
exports.TIPO_COMISION = {
    chofer: 1,
    retiro: 2,
    entrega: 3,
    nuevoCliente: 4,
    puntoVenta: 8
};
exports.TIPO_UNIDAD_COMISION = {
    porcentaje: 1,
    monto: 2
};
exports.TIPO_FORMATO_DOCUMENTO_TRIBUTARIO = {
    p: 1,
    e: 2
};
exports.TIPO_OPERACION_DOCUMENTO_TRIBUTARIO = {
    ninguna: 0,
    suma: 1,
    resta: 2
};
exports.TIPO_ESTADO_VENTA = {
    borrador: 0,
    por_asignar: 10,
    cotizacion: 12,
    ot: 13,
    preparacion: 14,
    reparto: 15,
    entregado: 24,
    rechazado: 32,
    anulado: 33,
    pagado: 64,
};
exports.TIPO_ESTADO_RUTA_DESPACHO = {
    preparacion: 0,
    orden_cargada: 1,
    orden_confirmada: 2,
    checklist_vehiculo: 3,
    seleccion_destino: 4,
    en_ruta: 5,
    descarga: 8,
    descarga_confirmada: 9,
    carga: 10,
    carga_confirmada: 11,
    regreso: 16,
    regreso_confirmado: 17,
    terminado: 32,
    cancelado: 33,
    a_reasignar: 34,
    anulado: 64
};
exports.TIPO_CATEGORIA_CATALOGO = {
    sinCategoria: 0,
    gas: 1,
    arriendo: 2,
    insumo: 4,
    servicio: 8,
    flete: 16,
    garantia: 32,
    producto: 64,
};
