import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { User } from "../models/User.js";
import { requireAuth, setSessionCookie, signSession } from "../middleware/auth.js";

const router = Router();
const ADMIN_EMAIL = "faheemjinna.s@gmail.com";
const credentialsSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(10).max(200),
  name: z.string().max(120).optional(),
});

function publicUser(user) {
  return { id: String(user._id), email: user.email, name: user.name, role: user.role, approvalStatus: user.approvalStatus };
}

function isAdminEmail(email) {
  return email.toLowerCase() === ADMIN_EMAIL;
}

async function ensureAdmin(user) {
  if (!isAdminEmail(user.email)) return user;
  if (user.role === "admin" && user.approvalStatus === "approved") return user;
  user.role = "admin";
  user.approvalStatus = "approved";
  await user.save();
  return user;
}

async function requireAdmin(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ message: "Authentication required" });
    await ensureAdmin(user);
    if (user.role !== "admin") return res.status(403).json({ message: "Admin access required." });
    req.adminUser = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

router.post("/signup", async (req, res, next) => {
  try {
    const input = credentialsSchema.parse(req.body);
    const email = input.email.toLowerCase();
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: "An account already exists for that email." });
    const passwordHash = await bcrypt.hash(input.password, 12);
    const isAdmin = isAdminEmail(email);
    const user = await User.create({
      email,
      name: input.name ?? "",
      passwordHash,
      role: isAdmin ? "admin" : "user",
      approvalStatus: isAdmin ? "approved" : "pending",
    });
    if (!isAdmin) {
      return res.status(202).json({ message: "Your account request was sent. You can sign in after the admin approves it." });
    }
    const token = signSession(user);
    setSessionCookie(res, token);
    return res.status(201).json({ user: publicUser(user), token });
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
    await ensureAdmin(user);
    if (user.approvalStatus === "pending") {
      return res.status(403).json({ message: "Your account is waiting for admin approval." });
    }
    if (user.approvalStatus === "rejected") {
      return res.status(403).json({ message: "Your account request was not approved. Contact the admin for help." });
    }
    const token = signSession(user);
    setSessionCookie(res, token);
    res.json({ user: publicUser(user), token });
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
    await ensureAdmin(user);
    if (user.approvalStatus !== "approved") {
      res.clearCookie("mm_session", { path: "/" });
      return res.status(403).json({ message: "Your account is waiting for admin approval." });
    }
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.get("/admin/users", requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const users = await User.find({ role: { $ne: "admin" } })
      .select("name email role approvalStatus createdAt updatedAt")
      .sort({ approvalStatus: 1, createdAt: -1 });
    res.json({
      users: users.map((user) => ({
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
        createdAt: user.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/admin/users/:id/approve", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const user = await User.findOneAndUpdate({ _id: req.params.id, role: { $ne: "admin" } }, { approvalStatus: "approved" }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/admin/users/:id/reject", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const user = await User.findOneAndUpdate({ _id: req.params.id, role: { $ne: "admin" } }, { approvalStatus: "rejected" }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

export default router;
