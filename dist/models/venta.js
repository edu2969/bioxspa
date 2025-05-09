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
const ventaSchema = new mongoose_1.Schema({
    temporalId: { type: String },
    clienteId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Cliente", required: true },
    codigo: { type: String },
    vendedorId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Usuario", required: true },
    fecha: { type: Date, required: true },
    estado: { type: Number, required: true },
    porCobrar: { type: Boolean, default: false },
    valorNeto: { type: Number, required: true },
    valorExento: { type: Number, default: 0 },
    valorIva: { type: Number, required: true },
    valorBruto: { type: Number, required: true },
    valorTotal: { type: Number, required: true },
    numeroDocumento: { type: String },
    numeroVale: { type: String },
    documentoTributarioId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "DocumentoTributario", required: true },
    sucursalDestinoId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "SucursalDestinoId" },
    tasaImpuesto: { type: Number },
    tieneOT: { type: Boolean, default: false },
    tieneArriendo: { type: Boolean, default: false },
    controlEnvase: { type: String, default: null },
    medioDespacho: { type: String },
    numeroTraslado: { type: String, default: "" },
    cantidadConsultasSII: { type: Number },
    cantidadReenviosSII: { type: Number }
}, {
    timestamps: true
});
const Venta = mongoose_1.models.Venta || mongoose_1.default.model("Venta", ventaSchema);
exports.default = Venta;
