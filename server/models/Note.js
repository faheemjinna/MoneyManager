import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: "" },
    tags: { type: [String], default: [] },
    pinned: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

noteSchema.index({ userId: 1, pinned: -1, updatedAt: -1 });

export const Note = mongoose.model("Note", noteSchema);
