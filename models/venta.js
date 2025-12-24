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

const entregaEnLocalSchema = new Schema({
    nombreRecibe: { type: String, required: true },
    rutRecibe: { type: String, required: true }    
}, {
    _id: false,
    timestamps: true
}); // Sub

const ventaSchema = new Schema({
    temporalId: { type: String },
    tipo: { type: Number, required: true }, // 1: Venta, 2: Translado, 3: Orden de Trabajo, 4: Cotizacion
    clienteId: { type: mongoose.Schema.Types.ObjectId, ref: "Cliente", required: true },
    codigo: { type: String },
    vendedorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sucursalId: { type: mongoose.Schema.Types.ObjectId, ref: "Sucursal", required: true },
    dependenciaId: { type: mongoose.Schema.Types.ObjectId, ref: "Dependencia" },
    fecha: { type: Date },
    estado: { type: Number, required: true },
    porCobrar: { type: Boolean, default: false },
    valorNeto: { type: Number },
    valorExento: { type: Number },
    valorIva: { type: Number },
    valorBruto: { type: Number },
    valorTotal: { type: Number },
    numeroDocumento: { type: String },
    numeroVale: { type: String },
    saldo: { type: Number, default: 0 },
    documentoTributarioId: { type: mongoose.Schema.Types.ObjectId, ref: "DocumentoTributario" },
    direccionDespachoId: { type: mongoose.Schema.Types.ObjectId, ref: "Direccion" },
    tasaImpuesto: { type: Number },
    tieneOT: { type: Boolean, default: false },
    numeroOrden: { type: String },
    codigoHES: { type: String },
    tieneArriendo: { type: Boolean, default: false },
    controlEnvase: { type: String, default: null },
    medioDespacho: { type: String },
    numeroTraslado: { type: String, default: "" },
    cantidadConsultasSII: { type: Number },
    cantidadReenviosSII: { type: Number },
    comentario: { type: String, default: "" },
    comentariosCobro: { type: [comentarioCobroSchema], default: [] },
    historialEstados: { type: [historialEstadoSchema], default: [] },
    entregasEnLocal: { type: [entregaEnLocalSchema] },
}, {
    timestamps: true
});

const Venta = models.Venta || mongoose.model("Venta", ventaSchema);
export default Venta;