import mongoose from "mongoose";

const accountSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    institutionRef: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", default: null },
    source: { type: String, enum: ["manual", "plaid"], default: "manual" },
    providerAccountId: { type: String, default: "", index: true },
    name: { type: String, required: true, trim: true },
    bankId: { type: String, default: "chase" },
    type: { type: String, enum: ["Checking", "Savings", "Money Market", "Cash", "Investment"], required: true },
    subtype: { type: String, default: "" },
    last4: { type: String, default: "" },
    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    availableBalance: { type: Number, default: null },
    currencyCode: { type: String, default: "USD" },
    color: { type: String, default: "#0a84ff" },
  },
  { timestamps: true }
);

accountSchema.index({ userId: 1, providerAccountId: 1 }, { sparse: true });

export const Account = mongoose.model("Account", accountSchema);
