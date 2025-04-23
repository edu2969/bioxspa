import mongoose, { Schema, models } from "mongoose";

// filepath: d:\git\bioxspa\models\xehiculo.js

const xehiculoSchema = new Schema({
    id: { type: String, required: true },
    patente: { type: String, required: true },
    marca: { type: String, required: true },
    modelo: { type: String, required: true },
    nmotor: { type: String, default: null },
    nchasis: { type: String, required: true },
    ano: { type: String, required: true },
    datosempresas_id: { type: String, required: true },
    revisiontecnica: { type: Date, required: true },
    fecha_vencimiento_extintor: { type: Date, default: null }
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

const Xehiculo = models.Xehiculo || mongoose.model("Xehiculo", xehiculoSchema);
export default Xehiculo;