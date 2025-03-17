import mongoose, { Schema, models } from "mongoose";

const comisionSchema = new Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        clienteId: { type: mongoose.Schema.Types.ObjectId, ref: "Cliente" },
        sucursalId: { type: mongoose.Schema.Types.ObjectId, ref: "Sucursal" },
        dependenciaId: { type: mongoose.Schema.Types.ObjectId, ref: "Dependencia" },
        fechaDesde: { type: Date, required: true },
        fechaHasta: { type: Date },
        tipo: { type: Number, default: 0 },
        valor: { type: Number, default: 0 },
        unidad: { type: Number, default: 0 }, 
    },
    { timestamps: true }
);

const Comision = models.Comision || mongoose.model("Comision", comisionSchema);
export default Comision;
