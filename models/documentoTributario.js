import mongoose, { Schema, models } from "mongoose";

const documentoTributarioSchema = new Schema({
    nombre: { type: String, required: true },
    stock: { type: Number, required: true },
    afecto: { type: Boolean, default: false },
    compra: { type: String, required: true },
    venta: { type: String, required: true },
    operacion: { type: Number, required: true }, // 0: Ninguna, 1: suma, 2: resta
    formato: { type: String, required: true }
}, {
    timestamps: true
});

const DocumentoTributario = models.DocumentoTributario || mongoose.model("DocumentoTributario", documentoTributarioSchema);
export default DocumentoTributario;