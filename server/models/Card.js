import mongoose from "mongoose";

const rewardRuleSchema = new mongoose.Schema(
  {
    category: String,
    rate: Number,
    cap: String,
    note: String,
  },
  { _id: false }
);

const cardSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    institutionRef: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", default: null },
    source: { type: String, enum: ["manual", "plaid"], default: "manual" },
    providerAccountId: { type: String, default: "", index: true },
    nickname: { type: String, required: true, trim: true },
    templateId: { type: String, default: "custom" },
    issuerId: { type: String, default: "chase" },
    network: { type: String, default: "Credit" },
    last4: { type: String, default: "" },
    creditLimit: { type: Number, default: 0 },
    startingDebt: { type: Number, default: 0 },
    currentDebt: { type: Number, default: 0 },
    availableCredit: { type: Number, default: null },
    apr: { type: Number, default: 0 },
    minimumPayment: { type: Number, default: 0 },
    dueDay: { type: Number, default: 1 },
    statementDay: { type: Number, default: 1 },
    accent: { type: String, default: "#111827" },
    rewards: { type: [rewardRuleSchema], default: [] },
  },
  { timestamps: true }
);

cardSchema.index({ userId: 1, providerAccountId: 1 }, { sparse: true });

export const Card = mongoose.model("Card", cardSchema);
