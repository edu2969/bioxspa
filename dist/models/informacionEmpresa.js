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
const informacionEmpresaSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    rut: { type: String, required: true },
    cfolio: { type: String },
    razonsocial: { type: String, required: true },
    razoncorta: { type: String, required: true },
    giro: { type: String, required: true },
    direccion: { type: String, required: true },
    comuna_id: { type: String, required: true },
    ciudad: { type: String, required: true },
    telefono: { type: String, required: true },
    web: { type: String, required: true },
    mail: { type: String, required: true },
    piecoti: { type: String, required: true },
    Acteco: { type: String, required: true },
    rutfirma: { type: String, required: true },
    NmbContacto: { type: String, required: true },
    CdgSIISucur: { type: String, required: true },
    SucSii: { type: String },
    FchResol: { type: Date },
    NroResol: { type: String, required: true },
    tipocuenta: { type: String, required: true },
    numerodecuenta: { type: String, required: true },
    bancodelaempresa: { type: String, required: true },
    ppm: { type: String, required: true },
    intercambio: { type: String },
    passintercambio: { type: String },
    confirma_pedido: { type: String, required: true },
    tipoprecioventa: { type: String, required: true },
    popUpcuentas: { type: String },
    linea_whatsapp: { type: String },
    linea_whatsapp_cc: { type: String },
    chapp_puerto: { type: String },
    chapp_token: { type: String },
    enviar_whatsapp: { type: String },
    created_at: { type: Date, required: true },
    updated_at: { type: Date, required: true },
    deleted_at: { type: Date, default: null }
});
const InformacionEmpresa = mongoose_1.models.InformacionEmpresa || mongoose_1.default.model("InformacionEmpresa", informacionEmpresaSchema);
exports.default = InformacionEmpresa;
