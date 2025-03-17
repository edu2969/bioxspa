import mongoose from 'mongoose';

const HistorialSchema = new mongoose.Schema({
    valor: { type: Number, required: true },
    fechaDesde: { type: Date, required: true },
    varianza: { type: Number, required: true }
}, { _id: false });

const PrecioSchema = new mongoose.Schema({
    itemCatalogoId: { type: mongoose.Schema.Types.ObjectId, ref: 'ItemCatalogo', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    clienteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },
    dependenciaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dependencia', default: null },
    sucursalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sucursal', default: null },
    valorBruto: { type: Number, required: true },
    impuesto: { type: Number, required: true },
    moneda: { type: String, required: true },
    valor: { type: Number, required: true },
    fechaDesde: { type: Date, required: true },
    fechaHasta: { type: Date },
    historial: [HistorialSchema]
}, { timestamps: true });

const Precio = mongoose.models.Precio || mongoose.model('Precio', PrecioSchema);

export default Precio;