import mongoose, { Schema, models } from "mongoose";

const contractSchema = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    identifier: {
      type: Number,
      required: true,
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    title: {
      type: String,
      required: true,
    },
    status: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
    },
    netAmount: {
      type: Number,
      required: true,
    },
    termsOfPayment: {
      type: String,
      required: true,
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    createdAt: {
      type: Date,
      required: true,
    }
  },
  { timestamps: true }
);

const Contract = models.Contract || mongoose.model("Contract", contractSchema);
export default Contract;