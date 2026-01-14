import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { prisma } from "./lib/prisma";

dotenv.config();

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@diprochil.cl";
  const password = process.env.ADMIN_PASSWORD ?? "Admin123456!";
  const nombre = process.env.ADMIN_NAME ?? "Administrador";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("✅ Admin ya existe:", email);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      nombre,
      email,
      passwordHash,
      role: "ADMIN",
      active: true,
    },
  });

  console.log("✅ Admin creado:", email);
  console.log("   ⚠️  Guarda la contraseña del archivo .env de forma segura");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
