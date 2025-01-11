import mongoose, { Schema, models } from "mongoose";

const projectSchema = new Schema(
  {
    contractId: {
      type: Schema.Types.ObjectId,
      ref: "Contract",
    },
    identifier: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    projectType: {
      type: Number,
      required: true,
    },
    status: {
      type: Number,
      required: true,
    },
    netAmount: {
      type: Number,
    },
    balance: {
      type: Number,
    },
    currency: {
      type: String,
    },
    kickOff: {
      type: Date,
    },
    end: {
      type: Date,
    },
    rentability: {
      type: Number,
    },
    percentageComplete: {
      type: Number,
    },
    estimatedHrs: {
      type: Number,
    },
  },
  { timestamps: true }
);

const Project = models.Project || mongoose.model("Project", projectSchema);
export default Project;