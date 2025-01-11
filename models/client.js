import mongoose, { Schema, models } from "mongoose";

const clientSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    completeName: {
        type: String,
    },
    identificationId: {
      type: String,
    },
    identificationType: {
      type: String,
    },
    email: {
      type: String,
    },
    address: {
      type: String,
    },
    imgLogo: {
      type: String,
    },
  },
  { timestamps: true }
);

const Client = models.Client || mongoose.model("Client", clientSchema);
export default Client;