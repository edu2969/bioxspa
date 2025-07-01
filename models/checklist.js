import mongoose, { Schema, models } from "mongoose";

const itemCheckListSchema = new Schema({
    tipo: { type: Number, required: true },
    valor: { type: Number, default: true }
}, { _id: false });

const checklistSchema = new Schema({
    tipo: { type: Number, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "Cliente", required: true },
    vehiculoId: { type: Schema.Types.ObjectId, ref: "Vehiculo", required: true },
    kilometraje: { type: Number, required: true },
    fecha: { type: Date, required: true },
    passed: { type: Boolean, default: false },
    items: [itemCheckListSchema]
}, {
    timestamps: true
});

const Checklist = models.Checklist || mongoose.model("Checklist", checklistSchema);
export default Checklist;