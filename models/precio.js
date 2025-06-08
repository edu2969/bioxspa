import mongoose from 'mongoose';

const HistorialSchema = new mongoose.Schema({
    valor: { type: Number, required: true },
    fecha: { type: Date, required: true },
    varianza: { type: Number, required: true }
}, { _id: false });

const PrecioSchema = new mongoose.Schema({
    subcategoriaCatalogoId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubcategoriaCatalogo', required: true },
    clienteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },
    dependenciaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dependencia', default: null },
    sucursalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sucursal', default: null },
    valorBruto: { type: Number, required: true },
    impuesto: { type: Number, required: true },
    moneda: { type: String, required: true },
    valor: { type: Number, required: true },
    historial: [HistorialSchema],
    fechaDesde: { type: Date, default: Date.now },
}, { timestamps: true });

const Precio = mongoose.models.Precio || mongoose.model('Precio', PrecioSchema);

export default Precio;