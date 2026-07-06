import mongoose from "mongoose";

const calendarEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    start: { type: String, required: true },
    end: { type: String, default: "" },
    location: { type: String, default: "" },
    meetingLink: { type: String, default: "" },
    attendees: { type: [String], default: [] },
    sourceEmail: { type: String, default: "" },
    provider: { type: String, default: "" },
    providerEventId: { type: String, default: "" },
    notes: { type: String, default: "" },
    color: { type: String, default: "#0a84ff" },
  },
  { timestamps: true }
);

calendarEventSchema.index({ userId: 1, start: 1 });
calendarEventSchema.index({ userId: 1, provider: 1, providerEventId: 1 });

export const CalendarEvent = mongoose.model("CalendarEvent", calendarEventSchema);
