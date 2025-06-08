"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const rutaSchema = new mongoose_1.Schema({
    direccionDestinoId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Direccion" },
    fechaArribo: { type: Date, default: null }
}, { _id: false });
const estadoHistorialSchema = new mongoose_1.Schema({
    estado: { type: Number, required: true },
    fecha: { type: Date, required: true }
}, { _id: false });
const checklistSchema = new mongoose_1.Schema({
    tarea: { type: Number, required: true },
    fecha: { type: Date, required: true }
}, { _id: false });
const cargaHistorialSchema = new mongoose_1.Schema({
    esCarga: { type: Boolean, required: true },
    fecha: { type: Date, required: true },
    itemMovidoIds: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: "ItemCatalogoId" }]
}, { _id: false });
const rutaDespachoSchema = new mongoose_1.Schema({
    vehiculoId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Vehiculo" },
    choferId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User", required: true },
    horaInicio: { type: Date },
    horaDestino: { type: Date },
    dependenciaId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Dependencia" },
    ruta: [rutaSchema],
    estado: { type: Number, required: true },
    historialEstado: [estadoHistorialSchema],
    checklist: [checklistSchema],
    ventaIds: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: "Venta" }],
    cargaItemIds: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: "ItemCatalogo" }],
    hitorialCarga: [cargaHistorialSchema],
}, {
    timestamps: true
});
const RutaDespacho = mongoose_1.models.RutaDespacho || mongoose_1.default.model("RutaDespacho", rutaDespachoSchema);
exports.default = RutaDespacho;
