import mongoose, { Schema, models } from "mongoose";

const comisionSchema = new Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        fechaDesde: {
            type: Date,
            default: new Date("2021-01-01"),
        },
        fechaHasta: {
            type: Date,
            default: null,
        },
        comisionGeneral: {
            type: Number,
            default: 0,
        },
        comisionRetiro: {
            type: Number,
            default: 0,
        },
        comisionEntrega: {
            type: Number,
            default: 0,
        },
        comisionPtoVta: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

const Comision = models.Comision || mongoose.model("Comision", comisionSchema);
export default Comision;