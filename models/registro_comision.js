import mongoose, { Schema, models } from "mongoose";

const registroComisionSchema = new Schema({
    id: { type: String, required: true },
    venta_id: { type: String, required: true },
    clientes_id: { type: String, required: true },
    users_id: { type: String, default: null },
    trabajadores_id: { type: String, default: null },
    monto: { type: Number, required: true },
    operacion: { type: String, required: true },
    porcentaje_comision: { type: Number, default: null },
    valor_comision: { type: Number, required: true },
    glosa: { type: String, required: true },
    tipo_comision: { type: String, required: true },
    comentario: { type: String, default: null },
    bitacoraedicion: { type: String, default: null },
    fechabitacora: { type: Date, default: null },
    created_at: { type: Date, required: true },
    updated_at: { type: Date, required: true },
    deleted_at: { type: Date, default: null },
});

const RegistroComision = models.RegistroComision || mongoose.model("RegistroComision", registroComisionSchema);
export default RegistroComision;