import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signSession(user) {
  return jwt.sign({ sub: String(user._id), email: user.email }, env.jwtSecret, { expiresIn: "7d" });
}

export function setSessionCookie(res, token) {
  res.cookie("mm_session", token, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function requireAuth(req, res, next) {
  const bearerToken = req.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = req.cookies?.mm_session ?? bearerToken;
  if (!token) return res.status(401).json({ message: "Authentication required" });
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch {
    return res.status(401).json({ message: "Session expired" });
  }
}
