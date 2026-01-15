import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";

export async function login(emailOrIdentifier: string, password: string) {
  let user;
  const normalized = emailOrIdentifier.toLowerCase().trim();

  if (normalized.includes("@")) {
    user = await prisma.user.findUnique({ where: { email: normalized } });
  } else {
    user = await prisma.user.findFirst({
      where: {
        email: { startsWith: normalized + "@" }
      }
    });
  }

  if (!user || !user.active) {
    return null;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;

  const secret = process.env.JWT_SECRET!;
  const token = jwt.sign(
    { role: user.role, email: user.email },
    secret,
    { subject: String(user.id), expiresIn: "8h" }
  );

  return {
    token,
    user: {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      role: user.role,
    },
  };
}
