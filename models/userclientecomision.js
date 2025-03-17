import mongoose, { Schema, models } from "mongoose";

const userClienteComisionSchema = new Schema(
    {
        users_id: { type: String, required: true },
        clientes_id: { type: String, required: true },
        desde: { type: Date, required: true },
        hasta: { type: Date, required: true },
        comision: { type: Number, required: true },
    },
    { timestamps: true }
);

const UserClienteComision = models.UserClienteComision || mongoose.model("UserClienteComision", userClienteComisionSchema);
export default UserClienteComision;