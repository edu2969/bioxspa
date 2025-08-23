import mongoose, { Schema, models } from "mongoose";

const pagoSchema = new Schema(
    {
        temporalId: { type: String },
        ventaId: { type: Schema.Types.ObjectId, ref: "Venta", required: true },
        monto: { type: Number, required: true },
        formaPagoId: { type: Schema.Types.ObjectId, ref: "FormaPago", required: true },
        adjuntoUrls: { type: [String], default: [] },
        fecha: { type: Date, required: true }
    },
    { timestamps: true }
);

const Pago = models.Pago || mongoose.model("Pago", pagoSchema);
export default Pago;