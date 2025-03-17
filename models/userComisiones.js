import mongoose, { Schema, models } from "mongoose";

const userComisionesSchema = new Schema({
    usersId: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    mes: { type: Number, required: true },
    porcentajeComision: { type: Number, required: true },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
    deletedAt: { type: Date, default: null },
});

const UserComisiones = models.UserComisiones || mongoose.model("UserComisiones", userComisionesSchema);
export default UserComisiones;