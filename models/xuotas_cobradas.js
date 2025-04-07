import mongoose, { Schema, models } from "mongoose";

// filepath: d:/git/bioxspa/models/cuotas_cobradas.js

const cuotasCobradasSchema = new Schema(
    {
        id: { type: String, required: true },
        venta_id: { type: String, required: true },
        monto: { type: Number, required: true },
        formapago_id: { type: String, required: true },
        operacion: { type: String, required: true },
        fecha: { type: Date, required: true },
        visible: { type: String, default: "si" },
        users_id: { type: String, required: true },
        deleted_at: { type: Date, default: null },
        created_at: { type: Date, required: true },
        updated_at: { type: Date, required: true },
    },
    { timestamps: false }
);

const XuotaCobrada = models.XuotaCobrada || mongoose.model("XuotaCobrada", cuotasCobradasSchema);
export default XuotaCobrada;