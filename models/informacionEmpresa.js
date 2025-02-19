import mongoose, { Schema, models } from "mongoose";

const informacionEmpresaSchema = new Schema({
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

const InformacionEmpresa = models.InformacionEmpresa || mongoose.model("InformacionEmpresa", informacionEmpresaSchema);
export default InformacionEmpresa;