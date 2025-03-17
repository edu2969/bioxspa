import mongoose, { Schema, models } from "mongoose";

const productoClienteSchema = new Schema({
    id: { type: String, required: true },
    clientes_id: { type: String, required: true },
    categoria_id: { type: Number, required: true },
    subcategoria_id: { type: Number, required: true },
    precio1: { type: Number, required: true },
    precio2: { type: Number, default: null },
    precio3: { type: Number, default: null },
    valor_arriendo: { type: Number, default: null },
    deleted_at: { type: Date, default: null },
    created_at: { type: Date, required: true },
    updated_at: { type: Date, required: true },
});

const ProductoCliente = models.ProductoCliente || mongoose.model("ProductoCliente", productoClienteSchema);
export default ProductoCliente;