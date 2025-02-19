import mongoose from 'mongoose';

const BodegaSchema = new mongoose.Schema({
    nombre: { type: String },
    sucursalId: { type: mongoose.Types.ObjectId, ref: 'Sucursal' },
    direccionId: { type: mongoose.Types.ObjectId, ref: 'Direccion' },
    operativa: { type: Boolean },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Bodega = mongoose.models.Bodega || mongoose.model('Bodega', BodegaSchema);

export default Bodega;