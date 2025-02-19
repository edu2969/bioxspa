import mongoose, { Schema, models } from "mongoose";

const clienteSchema = new Schema({
    id: { type: String, required: true },
    rut: { type: String, required: true },
    nombre: { type: String, required: true },
    direccion: { type: String, required: true },
    comuna_id: { type: String, required: true },
    ciudad: { type: String, required: true },
    telefono: { type: String },
    giro: { type: String },
    email: { type: String },
    email_intercambio: { type: String, default: null },
    creado_por: { type: String, default: null },
    envio_factura: { type: String, default: null },
    envio_reporte: { type: String, default: null },
    seguimiento: { type: String, default: null },
    orden_compra: { type: String, default: null },
    reporte_deuda: { type: String, default: null },
    arriendo: { type: String, default: null },
    dias_de_pago: { type: String, default: null },
    notificacion: { type: String, default: null },
    credito: { type: String, default: null },
    web: { type: String },
    comentario: { type: String },
    contacto: { type: String },
    tipoprecio: { type: String, required: true },
    tipodoc: { type: String, default: null },
    cta_cobrada: { type: String, default: null },
    garantia: { type: String, default: null },
    activo: { type: String },
    limite_cilindros: { type: String },
    password: { type: String, required: true },
    remember_token: { type: String, default: null },
    quiebra: { type: String, required: true },
    users_id: { type: String, default: null },
    mesesaumento: { type: String, default: null },
    porcentajeaumento: { type: String, default: null },
    ultimocambioprecio: { type: Date },
    vta_cliente: { type: String },
    ultimollamado: { type: String, default: null },
    ubicacion: { type: String, default: null },
    cilindrosminimo: { type: String, default: null },
    tipodespacho: { type: String, default: null },
    valordespacho: { type: String, default: null },
    created_at: { type: Date, required: true },
    updated_at: { type: Date, required: true },
    deleted_at: { type: Date, default: null }
});

const Cliente = models.Cliente || mongoose.model("Cliente", clienteSchema);
export default Cliente;