export const USER_ROLE = {
    neo: 2969,
    gerente: 1,
    cobranza: 2,
    encargado: 8,
    responsable: 9,
    despacho: 16,
    conductor: 32,
    proveedor: 64 
}

export const TIPO_DEPENDENCIA = {
    sucursal: 1,
    bodega: 10,
    sucursal_bodega: 11,
    bodega_proveedor: 20,
}

export const TIPO_CARGO = {
    neo: 2969,
    gerente: 1,
    cobranza: 2,
    encargado: 8,
    responsable: 9,
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

export const TIPO_ORDEN = {
    'venta': 1,
    'traslado': 2,
    'orden_de_trabajo': 3,
    'cotizacion': 4
}

export const TIPO_ESTADO_VENTA = {
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
    cerrado: 128
}

export const TIPO_ESTADO_RUTA_DESPACHO = {
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
}

export const TIPO_CATEGORIA_CATALOGO = {
    sinCategoria: 0,
    gas: 1,
    arriendo: 2,
    insumo: 4, 
    servicio: 8,
    flete: 16, 
    garantia: 32,
    producto: 64,
}

export const TIPO_ITEM_CATALOGO = {
    producto: 1,
    servicio: 2,
    flete: 3,
    garantia: 4,
    arriendo: 5,
    insumo: 6,
    cilindro: 7,
}

export const TIPO_ESTADO_ITEM_CATALOGO = {
    no_aplica: 127,
    en_mantenimiento: 1,
    en_arriendo: 2,
    en_garantia: 4,    
    vacio: 8,
    en_llenado: 9,    
    lleno: 16,
}

export const TIPO_CHECKLIST = {
    vehiculo: 1,
    personal: 2
}

export const TIPO_CHECKLIST_ITEM = {
    tarjeta_combustible: 1,
    /*hoja_seguridad_transporte: 3,
    permiso_circulacion: 5,
    seguro_obligatorio: 7,
    botiquien: 9,
    limpieza_cabina: 10,
    bocina: 13,
    cinturon_conductor: 14,
    estado_pedal_freno: 16,
    luz_emergencia: 19,
    luz_bocina_retroceso: 20,
    luz_navegacion_posicion: 23,
    luces_altas: 25,
    luces_bajas: 26,
    intermitentes: 28,
    luz_patente: 31,
    luz_freno: 32,
    freno_mano: 34,
    espejos_laterales: 36,
    cintas_reflectantes: 39,
    regulador_oxigeno_argon: 40,
    neumaticos_delanteros: 42,
    neumaticos_traseros: 44,
    neumatico_repuesto: 46,
    limpieza_exterior: 49,
    conos_seguridad: 50,*/

    zapatos_seguridad: 128,
    /*polera_geologo: 130,
    guantes_seguridad: 133,
    bloqueador_solar: 135,
    intercomunicador: 137,
    pantalon: 138,
    casco: 140,
    lentes: 142,
    impresora: 144*/
}

export const TIPO_ESTADO_CHECKLIST = {
    pendiente: 0,
    aprobado: 1,
    rechazado: 2
}