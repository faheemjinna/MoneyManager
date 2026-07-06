import mongoose from "mongoose";

const connectedCalendarSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    summary: { type: String, default: "Calendar" },
    primary: { type: Boolean, default: false },
    selected: { type: Boolean, default: true },
    backgroundColor: { type: String, default: "#0a84ff" },
  },
  { _id: false }
);

const calendarConnectionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    provider: { type: String, enum: ["google"], required: true, index: true },
    providerAccountId: { type: String, required: true },
    email: { type: String, required: true },
    name: { type: String, default: "" },
    accessTokenEncrypted: { type: String, required: true },
    refreshTokenEncrypted: { type: String, default: "" },
    expiresAt: { type: Date, default: null },
    calendars: { type: [connectedCalendarSchema], default: [] },
    status: { type: String, enum: ["active", "needs_reauth"], default: "active" },
    lastSyncedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

calendarConnectionSchema.index({ userId: 1, provider: 1, providerAccountId: 1 }, { unique: true });

export const CalendarConnection = mongoose.model("CalendarConnection", calendarConnectionSchema);
