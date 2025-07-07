import mongoose, { Schema, models } from "mongoose";

const direccionSchema = new Schema({
    direccionId: { type: Schema.Types.ObjectId, ref: 'Direccion', required: true },
    comentario: { type: String, default: null },
}, { _id: false });

const clienteSchema = new Schema({
    temporalId: { type: String },
    creadorId: { type: Schema.Types.ObjectId, ref: 'Usuario', default: null },
    nombre: { type: String, required: true },
    rut: { type: String, required: true },
    direccionId: { type: Schema.Types.ObjectId, ref: 'Direccion', default: null },
    giro: { type: String },
    telefono: { type: String },
    email: { type: String },
    emailIntercambio: { type: String, default: null },
    envioFactura: { type: Boolean, default: false },
    envioReporte: { type: Boolean, default: false },
    seguimiento: { type: Boolean, default: false },
    ordenCompra: { type: Boolean, default: false },
    reporteDeuda: { type: Boolean, default: false },
    arriendo: { type: Boolean, default: false },
    dias_de_pago: { type: Number, default: 1 },
    notificacion: { type: Boolean, default: false },
    credito: { type: Number, default: 300000 },
    urlWeb: { type: String },
    comentario: { type: String },
    contacto: { type: String },
    tipoPrecio: { type: Number, required: true }, // Mayorista, Minorista
    documentoTributarioId: { type: Schema.Types.ObjectId, ref: 'DocumentoTributario', default: null }, 
    activo: { type: Boolean, default: true },
    cilindrosMin: { type: String, default: 0 },
    cilindrosMax: { type: Number, default: 9999 },
    enQuiebra: { type: Boolean, default: false },
    mesesAumento: { type: [Number], default: null },
    direccionesDespacho: [{ type: direccionSchema, default: [] }]
}, {
    timestamps: true
});

const Cliente = models.Cliente || mongoose.model("Cliente", clienteSchema);
export default Cliente;