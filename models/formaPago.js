import mongoose, { Schema, models } from "mongoose";

const formaPagoSchema = new Schema({    
    temporalId: { type: String, required: true },
    nombre: { type: String, required: true },
    porPagar: { type: Boolean, default: false },    
}, {
    timestamps: true
});

const FormaPago = models.FormaPago || mongoose.model("FormaPago", formaPagoSchema);
export default FormaPago;