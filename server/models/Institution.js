import mongoose from "mongoose";

const institutionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    provider: { type: String, enum: ["plaid"], default: "plaid" },
    itemId: { type: String, required: true, index: true },
    institutionId: { type: String, default: "" },
    name: { type: String, required: true },
    accessTokenEncrypted: { type: String, required: true },
    syncCursor: { type: String, default: null },
    status: { type: String, enum: ["active", "needs_reauth", "removed"], default: "active" },
    lastSyncedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

institutionSchema.index({ userId: 1, itemId: 1 }, { unique: true });

export const Institution = mongoose.model("Institution", institutionSchema);
