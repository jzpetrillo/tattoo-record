import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const _jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
if (!_jwtSecret) {
  throw new Error("JWT_SECRET or SESSION_SECRET environment variable must be set");
}
const JWT_SECRET: string = _jwtSecret;

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as { userId: string };

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (!user || user.deletedAt || user.isBanned) {
      return res.status(401).json({ message: "Invalid authentication" });
    }

    req.userId = user.id;
    req.userRole = user.role;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

/**
 * Optional authentication middleware.
 * If a valid Bearer token is present for a non-banned, non-deleted user,
 * populates req.userId and req.userRole; otherwise passes through silently.
 * Use this on routes that are public but need caller identity when available.
 */
export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.substring(7);
    let decoded: { userId: string };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as unknown as { userId: string };
    } catch {
      return next(); // Invalid/expired token — treat as unauthenticated
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (user && !user.deletedAt && !user.isBanned) {
      req.userId = user.id;
      req.userRole = user.role;
    }
    next();
  } catch (error) {
    next(); // Never block on auth errors in optional middleware
  }
}

export function requireRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ 
        message: "Insufficient permissions for this action" 
      });
    }
    next();
  };
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}
