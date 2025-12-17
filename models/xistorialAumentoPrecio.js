import mongoose, { Schema, models } from "mongoose";

const xistorialAumentoPrecioSchema = new Schema({
    id: { type: String, required: true }, // obligatorio
    users_id: { type: String, required: true },
    productos_clientes_id: { type: String, required: true },
    valor_anterior: { type: String, required: true },
    porcentaje_aumento: { type: String, default: null },
    valor_nuevo: { type: String, required: true },
    created_at: { type: Date },
    updated_at: { type: Date }
}, {
    timestamps: false
});

const XistorialAumentoPrecio = models.XistorialAumentoPrecio || mongoose.model("XistorialAumentoPrecio", xistorialAumentoPrecioSchema);
export default XistorialAumentoPrecio;