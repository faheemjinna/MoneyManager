import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { User } from "../models/User.js";
import { requireAuth, setSessionCookie, signSession } from "../middleware/auth.js";

const router = Router();
const credentialsSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(10).max(200),
  name: z.string().max(120).optional(),
});

function publicUser(user) {
  return { id: String(user._id), email: user.email, name: user.name };
}

router.post("/signup", async (req, res, next) => {
  try {
    const input = credentialsSchema.parse(req.body);
    const existing = await User.findOne({ email: input.email.toLowerCase() });
    if (existing) return res.status(409).json({ message: "An account already exists for that email." });
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await User.create({ email: input.email, name: input.name ?? "", passwordHash });
    setSessionCookie(res, signSession(user));
    res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/signin", async (req, res, next) => {
  try {
    const input = credentialsSchema.pick({ email: true, password: true }).parse(req.body);
    const user = await User.findOne({ email: input.email.toLowerCase() });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    setSessionCookie(res, signSession(user));
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie("mm_session", { path: "/" });
  res.status(204).end();
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ message: "Authentication required" });
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

export default router;
