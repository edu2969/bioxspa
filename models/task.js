import mongoose, { Schema, models } from "mongoose";

const todoSchema = new Schema({
  finishedAt: {
    type: Date
  },
  title: {
    type: String,
    required: true,
  },
  hours: {
    type: Number,
    required: true,
  }
});

const logSchema = new Schema({
  collaboratorId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  entry: {
    type: String,
    required: true,
  }
});

const taskSchema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
    },
    priority: {
      type: Number,
      required: true,
    },
    taskType: {
      type: Number,
      required: true,
    },
    status: {
      type: Number,
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    weight: {
      type: Number,
    },
    estimatedWeight: {
      type: Number,      
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    logs: {
      type: [logSchema],
      default: [],
    },
    todos: {
      type: [todoSchema],
      default: [],
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    progress: {
      type: Number,
      default: 0,
    }
  },
  { timestamps: true }
);

const Task = models.Task || mongoose.model("Task", taskSchema);
export default Task;