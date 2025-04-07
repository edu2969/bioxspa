import mongoose, { Schema, models } from "mongoose";

const xormasPagoSchema = new Schema({
    id: { type: String, required: true },
    forma: { type: String, required: true },
    porpagar: { type: String, required: true },    
}, {
    timestamps: true
});

const XormasPago = models.XormasPago || mongoose.model("XormasPago", xormasPagoSchema);
export default XormasPago;