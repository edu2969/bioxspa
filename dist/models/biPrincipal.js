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
const biPrincipalSchema = new mongoose_1.Schema({
    sucursalId: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "Sucursal"
    },
    clienteId: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "Cliente"
    },
    fecha: { type: Date, required: true },
    periodo: { type: String, enum: ['D', 'S', 'M', 'A'], required: true },
    montoAdeudado: { type: Number, required: true },
    montoVendido: { type: Number, required: true },
    montoArrendado: { type: Number, required: true },
    m3Vendidos: { type: Number, default: 0 },
    m3Envasados: { type: Number, default: 0 },
    m3PorEnvasar: { type: Number, default: 0 },
    kgVendidos: { type: Number, default: 0 },
    kgEnvasados: { type: Number, default: 0 },
    kgPorEnvasar: { type: Number, default: 0 },
    cantidadCilindrosPrestados: { type: Number, default: 0 },
    cantidadCilindrosCliente: { type: Number, default: 0 },
    estado: { type: Number }
}, {
    timestamps: true
});
const BIPrincipal = mongoose_1.models.BIPrincipal || mongoose_1.default.model("BIPrincipal", biPrincipalSchema);
exports.default = BIPrincipal;
