// filepath: d:/git/bioxspa/models/historial_gas.js
import mongoose from 'mongoose';

const HistorialGasSchema = new mongoose.Schema({
    id: { type: String, required: true }, // ID único del historial
    productos_id: { type: String, required: true }, // ID del producto relacionado
    venta_id: { type: String, required: true }, // ID de la venta relacionada
    producto: { type: String, required: true }, // Código o identificador del producto
    ot: { type: String, default: null }, // Orden de trabajo, puede ser null
    tipo: { type: String, required: true }, // Tipo de movimiento (ej: 'recepcion')
    detalle: { type: String, required: true }, // Detalle del movimiento (ej: 'venta')
    detalle_venta_id: { type: String, required: true }, // ID del detalle de venta
    control_envase: { type: String, default: null }, // Control de envase, puede ser null
    estado_id: { type: String }, // Estado del registro
    fecha: { type: Date, required: true }, // Fecha del movimiento
    deleted_at: { type: Date, default: null }, // Fecha de eliminación lógica
}, { 
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

const XistorialGas = mongoose.models.XistorialGas || mongoose.model('XistorialGas', HistorialGasSchema);

export default XistorialGas;