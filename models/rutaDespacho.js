import mongoose, { Schema, models } from "mongoose";

const rutaSchema = new Schema({
    direccionDestinoId: { type: mongoose.Schema.Types.ObjectId, ref: "Direccion" },
    fechaArribo: { type: Date, default: null },
    rutQuienRecibe: { type: String, default: null },
    nombreQuienRecibe: { type: String, default: null }
}, { _id: false });

const estadoHistorialSchema = new Schema({
    estado: { type: Number, required: true },
    fecha: { type: Date, required: true }
}, { _id: false });

const cargaHistorialSchema = new Schema({
    esCarga: { type: Boolean, required: true },
    fecha: { type: Date, required: true },
    itemMovidoIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "ItemCatalogoId" }]
}, { _id: false });

const rutaDespachoSchema = new Schema({
    vehiculoId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehiculo" },
    choferId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    horaInicio: { type: Date },
    horaDestino: { type: Date },
    dependenciaId: { type: mongoose.Schema.Types.ObjectId, ref: "Dependencia" },
    ruta: [rutaSchema],
    estado: { type: Number, required: true },
    historialEstado: [estadoHistorialSchema],
    ventaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Venta" }],
    cargaItemIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "ItemCatalogo" }],
    historialCarga: [cargaHistorialSchema], 
}, {
    timestamps: true
});

const RutaDespacho = models.RutaDespacho || mongoose.model("RutaDespacho", rutaDespachoSchema);
export default RutaDespacho;