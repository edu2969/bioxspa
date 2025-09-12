import mongoose, { Schema, models } from "mongoose";

const comentarioCobroSchema = new Schema({
    fecha: { type: Date, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    comentario: { type: String, required: true },
}, {
    _id: false,
    timestamps: true
});

const historialEstadoSchema = new Schema({
    fecha: { type: Date, required: true },
    estado: { type: Number, required: true },
}, {
    _id: false,
    timestamps: false
});

const ventaSchema = new Schema({
    temporalId: { type: String },
    tipo: { type: Number, required: true }, // 1: Venta, 2: OT, 3: Translado, 4: Cotizacion
    clienteId: { type: mongoose.Schema.Types.ObjectId, ref: "Cliente", required: true },
    codigo: { type: String },
    vendedorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sucursalId: { type: mongoose.Schema.Types.ObjectId, ref: "Sucursal", required: true },
    dependenciaId: { type: mongoose.Schema.Types.ObjectId, ref: "Dependencia" },
    fecha: { type: Date, required: true },
    estado: { type: Number, required: true },
    porCobrar: { type: Boolean, default: false },
    valorNeto: { type: Number, required: true },
    valorExento: { type: Number, default: 0 },
    valorIva: { type: Number, required: true },
    valorBruto: { type: Number, required: true },
    valorTotal: { type: Number, required: true },
    numeroDocumento: { type: String },
    numeroVale: { type: String },
    saldo: { type: Number, default: 0 },
    documentoTributarioId: { type: mongoose.Schema.Types.ObjectId, ref: "DocumentoTributario", required: true },
    direccionDespachoId: { type: mongoose.Schema.Types.ObjectId, ref: "Direccion" },
    tasaImpuesto: { type: Number },
    tieneOT: { type: Boolean, default: false },
    tieneArriendo: { type: Boolean, default: false },
    controlEnvase: { type: String, default: null },
    medioDespacho: { type: String },
    numeroTraslado: { type: String, default: "" },
    cantidadConsultasSII: { type: Number },
    cantidadReenviosSII: { type: Number },
    comentario: { type: String, default: "" },
    comentariosCobro: { type: [comentarioCobroSchema], default: [] },
    historialEstados: { type: [historialEstadoSchema], default: [] }
}, {
    timestamps: true
});

const Venta = models.Venta || mongoose.model("Venta", ventaSchema);
export default Venta;