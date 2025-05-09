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
const clienteSchema = new mongoose_1.Schema({
    temporalId: { type: String },
    creadorId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Usuario', default: null },
    nombre: { type: String, required: true },
    rut: { type: String, required: true },
    direccionId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Direccion', default: null },
    giro: { type: String },
    telefono: { type: String },
    email: { type: String },
    emailIntercambio: { type: String, default: null },
    envioFactura: { type: Boolean, default: false },
    envioReporte: { type: Boolean, default: false },
    seguimiento: { type: Boolean, default: false },
    ordenCompra: { type: Boolean, default: false },
    reporteDeuda: { type: Boolean, default: false },
    arriendo: { type: Boolean, default: false },
    dias_de_pago: { type: Number, default: 1 },
    notificacion: { type: Boolean, default: false },
    credito: { type: Boolean, default: false },
    urlWeb: { type: String },
    comentario: { type: String },
    contacto: { type: String },
    tipoPrecio: { type: Number, required: true }, // Mayorista, Minorista
    documentoTributarioId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'DocumentoTributario', default: null },
    activo: { type: Boolean, default: true },
    cilindrosMin: { type: String, default: 0 },
    cilindrosMax: { type: Number, default: 9999 },
    enQuiebra: { type: Boolean, default: false },
    mesesAumento: { type: [Number], default: null },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
});
const Cliente = mongoose_1.models.Cliente || mongoose_1.default.model("Cliente", clienteSchema);
exports.default = Cliente;
