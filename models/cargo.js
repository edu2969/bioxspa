import mongoose, { Schema, models } from "mongoose";

const cargoSchema = new Schema({
    userId: { type: mongoose.Types.ObjectId, ref: "User", required: true },
    dependenciaId: { type: mongoose.Types.ObjectId, ref: "Dependencia" },
    sucursalId: { type: mongoose.Types.ObjectId, ref: "Sucursal" },
    tipo: { type: Number, required: true },
    desde: { type: Date, required: true },
    hasta: { type: Date }
}, {
    timestamps: true
});

const Cargo = models.Cargo || mongoose.model("Cargo", cargoSchema);
export default Cargo;