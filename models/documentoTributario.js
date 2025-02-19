import mongoose, { Schema, models } from "mongoose";

const documentoTributarioSchema = new Schema({
    id: { type: String, required: true },
    descripcion: { type: String, required: true },
    stock: { type: String, required: true },
    afecto: { type: String, required: true },
    compra: { type: String, required: true },
    venta: { type: String, required: true },
    operacion: { type: String, required: true },
    formato: { type: String, required: true },
    created_at: { type: Date, required: true },
    updated_at: { type: Date, required: true }
});

const DocumentoTributario = models.DocumentoTributario || mongoose.model("DocumentoTributario", documentoTributarioSchema);
export default DocumentoTributario;