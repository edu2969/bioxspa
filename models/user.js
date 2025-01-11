import mongoose, { Schema, models } from "mongoose";
import { type } from "os";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: Number,
      default: null,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      default: null
    },
    rut: {
      type: String,
    },
    gender: {
      type: String,
    },
    birthDate: {
      type: Date,
      default: null,
    },
    avatarImg: {
      type: String,
    }
  },
  { timestamps: true }
);

const User = models.User || mongoose.model("User", userSchema);
export default User;