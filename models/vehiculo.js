import mongoose from "mongoose";
const { Schema, models } = mongoose;

const vehiculoSchema = new Schema({
    temporalId: { type: String },
    patente: { type: String, required: true },
    marca: { type: String, required: true },
    modelo: { type: String, required: true },
    nmotor: { type: String, default: null },
    numeroChasis: { type: String },
    ano: { type: String },
    empresaId: { type: String },
    clienteId: { type: Schema.Types.ObjectId, ref: "Cliente", required: true },
    revisionTecnica: { type: Date, required: true },
    fechaVencimientoExtintor: { type: Date, default: null },
    direccionDestinoId: { type: String, default: null },
    choferIds: [{ type: Schema.Types.ObjectId, ref: "User", default: null }],
    posicionActual: {
        latitud: { type: Number, default: null },
        longitud: { type: Number, default: null }
    }
}, {
    timestamps: true
});

const Vehiculo = models.Vehiculo || mongoose.model("Vehiculo", vehiculoSchema);
export default Vehiculo;
