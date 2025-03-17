import mongoose, { Schema, models } from "mongoose";

const userSchema = new Schema(
  {
    temporalId: { type: String },
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    personaId: { type: mongoose.Schema.Types.ObjectId, ref: "Persona" },
    role: { type: Number, required: true },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const User = models.User || mongoose.model("User", userSchema);
export default User;