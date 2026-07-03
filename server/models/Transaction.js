import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    institutionRef: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", default: null },
    providerTransactionId: { type: String, default: "", index: true },
    type: { type: String, enum: ["expense", "income", "card-payment"], required: true },
    date: { type: String, required: true },
    merchant: { type: String, required: true, trim: true },
    category: { type: String, default: "Other" },
    amount: { type: Number, required: true },
    sourceKind: { type: String, enum: ["account", "card"], required: true },
    sourceId: { type: String, required: true },
    paymentAccountId: { type: String, default: "" },
    cashback: { type: Number, default: 0 },
    notes: { type: String, default: "" },
    pending: { type: Boolean, default: false },
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, providerTransactionId: 1 }, { sparse: true });

export const Transaction = mongoose.model("Transaction", transactionSchema);
