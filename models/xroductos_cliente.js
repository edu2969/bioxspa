import mongoose from 'mongoose';

const XroductosClienteSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    clientes_id: { type: String },
    categoria_id: { type: String },
    subcategoria_id: { type: String },
    precio1: { type: String },
    precio2: { type: String, default: null },
    precio3: { type: String, default: null },
    valor_arriendo: { type: String, default: null },
    deleted_at: { type: Date, default: null },
    created_at: { type: Date },
    updated_at: { type: Date }
}, { timestamps: false });

const XroductosCliente = mongoose.models.XroductosCliente || mongoose.model('XroductosCliente', XroductosClienteSchema);

export default XroductosCliente;