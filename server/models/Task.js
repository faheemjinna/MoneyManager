import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    notes: { type: String, default: "" },
    dueDate: { type: String, default: "" },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium", index: true },
    status: { type: String, enum: ["todo", "doing", "done"], default: "todo", index: true },
    list: { type: String, default: "Personal", trim: true },
  },
  { timestamps: true }
);

taskSchema.index({ userId: 1, status: 1, dueDate: 1 });

export const Task = mongoose.model("Task", taskSchema);
