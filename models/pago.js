import mongoose, { Schema, models } from "mongoose";

const pagoSchema = new Schema(
    {
        temporalId: { type: String, required: true },
        ventaId: { type: Schema.Types.ObjectId, ref: "Venta", required: true },
        monto: { type: Number, required: true },
        formaPagoId: { type: Schema.Types.ObjectId, ref: "FormaPago", required: true },
        operacion: { type: String },
        fecha: { type: Date, required: true },
        visible: { type: Boolean, default: true }
    },
    { timestamps: true }
);

const Pago = models.Pago || mongoose.model("Pago", pagoSchema);
export default Pago;