import mongoose, { Schema, models } from "mongoose";

const cuotaPagadaSchema = new Schema({
    id: { type: String, required: true },
    compra_id: { type: String, required: true },
    monto: { type: String, required: true },
    formapago_id: { type: String, required: true },
    operacion: { type: String },
    fecha: { type: Date, required: true },
    visible: { type: String, required: true },
    comentario: { type: String, default: null },
    deleted_at: { type: Date, default: null },
    created_at: { type: Date, required: true },
    updated_at: { type: Date, required: true }
});

const CuotaPagada = models.CuotaPagada || mongoose.model("CuotaPagada", cuotaPagadaSchema);
export default CuotaPagada;