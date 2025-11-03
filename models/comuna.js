import mongoose from 'mongoose';

const ComunaSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    region_id: { type: String, required: true }
}, { timestamps: true });

const Comuna = mongoose.models.Comuna || mongoose.model('Comuna', ComunaSchema);

export default Comuna;