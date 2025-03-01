import mongoose, { Schema, models } from "mongoose";

const personaSchema = new Schema(
  {
    nombres: {
      type: String,
      required: true,
    },
    apellidos: {
        type: String,
        required: true,
    },
    rut: {
      type: String,
      required: true,
    },
    telefono: {
      type: String,
    },
    profesion: {
      type: String,
      default: null,
    },
    banco: {
      type: String,
      default: null,
    },
    cuenta: {
      type: String,
      default: null,
    },
    color: {
      type: String,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Persona = models.Persona || mongoose.model("Persona", personaSchema);
export default Persona;