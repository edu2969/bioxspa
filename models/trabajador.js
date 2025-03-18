import mongoose, { Schema, models } from "mongoose";

const trabajadorSchema = new Schema(
    {
        id: { type: String, required: true},
        nombre: { type: String, required: true },
        patente: { type: String, default: null },
        rut: { type: String, required: true },
        ingreso: { type: Date, default: null },
        cargo: { type: String, required: true },
        telefono: { type: String, required: true },
        email: { type: String, required: true },
        prevision: { type: String, default: null },
        salud: { type: String, required: true },
        afp: { type: String, required: true },
        afp_id: { type: mongoose.Schema.Types.ObjectId, ref: "Afp", required: true },
        nombre_isapre: { type: String, default: null },
        chofer_de_la_empresa: { type: String, required: true },
        sueldo: { type: Number, required: true },
        datosempresas_id: { type: mongoose.Schema.Types.ObjectId, ref: "DatosEmpresa", required: true },
        fecha_ingreso: { type: Date, required: true },
        comision_retirado: { type: Number, default: 0 },
        comision_vendido: { type: Number, default: 0 },
        users_id: { type: String, default: null },
        deleted_at: { type: Date, default: null },
    },
    { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

const Trabajador = models.Trabajador || mongoose.model("Trabajador", trabajadorSchema);
export default Trabajador;