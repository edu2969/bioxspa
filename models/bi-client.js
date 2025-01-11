import mongoose, { Schema, models } from "mongoose";

const biClientSchema = new Schema(
  {
    clientId: {
      type: mongoose.Types.ObjectId,
      ref: "Client",
    },
    date: {
      type: Date,
      required: true,
    },
    period: {
      type: String,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

const BIClient = models.BIClient || mongoose.model("BIClient", biClientSchema);
export default BIClient;