import mongoose, { Schema, models } from "mongoose";

const vehiculoSchema = new Schema({
    id: { type: String, required: true },
    patente: { type: String, required: true },
    marca: { type: String, required: true },
    modelo: { type: String, required: true },
    nmotor: { type: String, default: null },
    nchasis: { type: String },
    ano: { type: String },
    datosempresas_id: { type: String, required: true },
    revisiontecnica: { type: Date, required: true },
    fecha_vencimiento_extintor: { type: Date, default: null },
    created_at: { type: Date, required: true },
    updated_at: { type: Date, required: true }
});

const Vehiculo = models.Vehiculo || mongoose.model("Vehiculo", vehiculoSchema);
export default Vehiculo;
