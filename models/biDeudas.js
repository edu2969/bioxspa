import mongoose, { Schema, models } from "mongoose";

const biVentasSchema = new Schema({
    sucursalId: { 
        type: mongoose.Types.ObjectId,
        ref: "Sucursal"
    },
    clienteId: {
        type: mongoose.Types.ObjectId,
        ref: "Cliente"
    },
    deuda: { type: Number, required: true },
    fecha: { type: Date, required: true },
    periodo: { type: String, enum: ['D', 'S', 'M', 'A'], required: true },
    createdAt: { type: Date, required: true, default: Date.now },
    updatedAt: { type: Date, required: true, default: Date.now }
});

const BiVentas = models.BiVentas || mongoose.model("BiVentas", biVentasSchema);
export default BiVentas;