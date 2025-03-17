import mongoose, { Schema, models } from "mongoose";

const xserSchema = new Schema({
  id: { type: String, required: true },
  nombre: { type: String, required: true },
  rut: { type: String, required: true },
  comision: { type: String, default: "0.00" },
  copiadte: { type: String, default: "Si" },
  perfil: { type: String },
  email: { type: String, required: true },
  telefono: { type: String },
  password: { type: String, required: true },
  activo: { type: String, default: "si" },
  sucursales_id: { type: String, required: true },
  profesion: { type: String, default: null },
  banco: { type: String, default: null },
  cuenta: { type: String, default: null },
  color: { type: String, default: null },
  permiso: { type: String, default: null },
  intentos: { type: String, default: null },
  impresora: { type: String, default: null },
  api_token: { type: String, default: null },
  remember_token: { type: String, default: null },
  datosempresas_id: { type: String, required: true },
  comi_retiro: { type: String, default: "0" },
  comi_entrega: { type: String, default: "0" },
  comi_punto_vta: { type: String, default: "3" },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: true });

const Xser = models.Xser || mongoose.model("Xser", xserSchema);
export default Xser;
