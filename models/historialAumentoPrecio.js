import mongoose, { Schema, models } from "mongoose";

const historialAumentoPrecioSchema = new Schema(
    {
        users_id: { type: String, required: true },
        productos_clientes_id: { type: String, required: true },
        valor_anterior: { type: Number, required: true },
        porcentaje_aumento: { type: Number, required: true },
        valor_nuevo: { type: Number, required: true },
    },
    { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

const HistorialAumentoPrecio = models.HistorialAumentoPrecio || mongoose.model("HistorialAumentoPrecio", historialAumentoPrecioSchema);
export default HistorialAumentoPrecio;