import mongoose, { Schema, models } from "mongoose";

const rutaSchema = new Schema({
    latitud: { type: Number, required: true },
    longitud: { type: Number, required: true },
    hora: { type: Date, required: true }
});

const estadoHistorialSchema = new Schema({
    estado: { type: Number, required: true },
    fecha: { type: Date, required: true }
});

const checklistSchema = new Schema({
    tarea: { type: Number, required: true },
    fecha: { type: Date, required: true }
});

const rutaDespachoSchema = new Schema({
    vehiculoId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehiculo" },
    choferId: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
    copilotoId: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario" },
    horaInicio: { type: Date },
    horaDestino: { type: Date },
    direccionInicioId: { type: mongoose.Schema.Types.ObjectId, ref: "Direccion" },
    direccionDestinoId: { type: mongoose.Schema.Types.ObjectId, ref: "Direccion" },
    ruta: [rutaSchema],
    estado: { type: Number, required: true },
    historialEstado: [estadoHistorialSchema],
    checklist: [checklistSchema],
    ventaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Venta" }] 
}, {
    timestamps: true
});

const RutaDespacho = models.RutaDespacho || mongoose.model("RutaDespacho", rutaDespachoSchema);
export default RutaDespacho;