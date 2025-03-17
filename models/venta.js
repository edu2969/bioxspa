import mongoose, { Schema, models } from "mongoose";

const ventaSchema = new Schema({
    temporalId: { type: String, required: true },
    clienteId: { type: mongoose.Schema.Types.ObjectId, ref: "Cliente", required: true },
    codigo: { type: String, required: true },
    vendedorId: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
    fecha: { type: Date, required: true },
    estado: { type: Number, required: true },
    valorNeto: { type: Number, required: true },
    valorExento: { type: Number, default: 0 },
    valorIva: { type: Number, required: true },
    valorBruto: { type: Number, required: true },
    valorTotal: { type: Number, required: true },
    numeroDocumento: { type: String },
    numeroVale: { type: String },
    documentoTributarioId: { type: String, required: true },
    sucursalDestinoId: { type: String },
    tasaImpuesto: { type: Number },
    tieneOT: { type: Boolean, default: false },
    control_envase: { type: String, default: null },
    medioDespacho: { type: String },
    numerotraslado: { type: String, default: "" },
    cantidadConsultasSII: { type: Number },
    cantidadReenviosSII: { type: Number },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
});

const Venta = models.Venta || mongoose.model("Venta", ventaSchema);
export default Venta;