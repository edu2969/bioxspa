import mongoose from "mongoose";
const { models } = mongoose;

const dependenciaSchema = new mongoose.Schema({
    nombre: { type: String },
    sucursalId: { type: mongoose.Types.ObjectId, ref: 'Sucursal' },
    direccionId: { type: mongoose.Types.ObjectId, ref: 'Direccion' },
    clienteId: { type: mongoose.Types.ObjectId, ref: 'Cliente' },
    operativa: { type: Boolean },
    tipo: { 
        type: Number,
        default: 10,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Dependencia = models.Dependencia || mongoose.model('Dependencia', dependenciaSchema);
export default Dependencia;