import mongoose from "mongoose";
const { Schema, models } = mongoose;

const sucursalSchema = new Schema({
    id: { type: Number, required: true },
    nombre: { type: String, required: true },
    direccionId: { type: mongoose.Types.ObjectId, ref: "Direccion" },
    visible: { type: Boolean, default: true },
    prioridad: { type: Number },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
});

const Sucursal = models.Sucursal || mongoose.model("Sucursal", sucursalSchema);
export default Sucursal;