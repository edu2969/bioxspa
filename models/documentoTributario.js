import mongoose, { Schema, models } from "mongoose";

const documentoTributarioSchema = new Schema({
    temporalId: { type: String, required: true },
    nombre: { type: String, required: true },
    stock: { type: Boolean, default: false },
    afecto: { type: Boolean, default: false },
    compra: { type: Boolean, default: false },
    venta: { type: Boolean, default: false },
    operacion: { type: Number, required: true }, // 0: Ninguna, 1: suma, 2: resta
    formato: { type: Number, required: true } // 1: p, 2: p
}, {
    timestamps: true
});

const DocumentoTributario = models.DocumentoTributario || mongoose.model("DocumentoTributario", documentoTributarioSchema);
export default DocumentoTributario;