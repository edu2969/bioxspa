import mongoose, { Schema, models } from "mongoose";

const biPrincipalSchema = new Schema({
    sucursalId: { 
        type: mongoose.Types.ObjectId,
        ref: "Sucursal"
    },
    clienteId: {
        type: mongoose.Types.ObjectId,
        ref: "Cliente"
    },
    fecha: { type: Date, required: true },
    periodo: { type: String, enum: ['D', 'S', 'M', 'A'], required: true },
    montoAdeudado: { type: Number, required: true },
    montoVendido: { type: Number, required: true },
    montoArrendado: { type: Number, required: true },
    m3Vendidos: { type: Number, default: 0 },
    m3Envasados: { type: Number, default: 0 },
    m3PorEnvasar: { type: Number, default: 0 },    
    kgVendidos: { type: Number, default: 0 },
    kgEnvasados: { type: Number, default: 0 },
    kgPorEnvasar: { type: Number, default: 0 },
    cantidadCilindrosPrestados: { type: Number, default: 0 },
    cantidadCilindrosCliente: { type: Number, default: 0 },
    estado: { type: Number }
}, {
    timestamps: true
});

const BIPrincipal = models.BIPrincipal || mongoose.model("BIPrincipal", biPrincipalSchema);
export default BIPrincipal;