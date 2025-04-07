import mongoose, { Schema, models } from "mongoose";

const biDeudasSchema = new Schema({
    sucursalId: { 
        type: mongoose.Types.ObjectId,
        ref: "Sucursal"
    },
    clienteId: {
        type: mongoose.Types.ObjectId,
        ref: "Cliente"
    },
    monto: { type: Number, required: true },
    fecha: { type: Date, required: true },
    periodo: { type: String, enum: ['D', 'S', 'M', 'A'], required: true },
    lastVentaId: {
        type: mongoose.Types.ObjectId,
        ref: "Venta",
        required: true
    }
}, { 
    timestamps: true
});

const BIDeuda = models.BIDeuda || mongoose.model("BIDeuda", biDeudasSchema);
export default BIDeuda;