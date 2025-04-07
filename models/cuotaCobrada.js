import mongoose, { Schema, models } from "mongoose";

const xuotaCobradaSchema = new Schema({
    id: { type: String, required: true },
    venta_id: { type: String, required: true },
    monto: { type: String, required: true },
    formapago_id: { type: String, required: true },
    operacion: { type: String },
    fecha: { type: Date, required: true },
    visible: { type: String, required: true },
    users_id: { type: String, default: null },
    deleted_at: { type: Date, default: null },
    created_at: { type: Date, required: true },
    updated_at: { type: Date, required: true }
});

const XuotaCobrada = models.XuotaCobrada || mongoose.model("XuotaCobrada", xuotaCobradaSchema);
export default XuotaCobrada;