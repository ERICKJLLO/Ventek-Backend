import "dotenv/config";
import bcrypt from "bcrypt";
import { prisma } from "../src/infrastructure/database/prisma.js";

const services = [
  ["Página web para negocio", "Sitio web profesional para presentar tu negocio.", "Desarrollo web"],
  ["Landing page", "Página enfocada en convertir visitantes en clientes.", "Desarrollo web"],
  ["Portafolio digital", "Espacio digital para mostrar proyectos y trabajos.", "Desarrollo web"],
  ["Aplicación web", "Aplicación web adaptada a las necesidades de tu negocio.", "Desarrollo web"],
  ["Mantenimiento de PC", "Diagnóstico y mantenimiento preventivo de computadoras.", "Soporte tecnológico"],
  ["Mantenimiento de laptop", "Limpieza, diagnóstico y mantenimiento de laptops.", "Soporte tecnológico"],
  ["Mantenimiento de consola", "Mantenimiento preventivo para consolas de videojuegos.", "Soporte tecnológico"],
  ["Cambio de pasta térmica", "Reemplazo de pasta térmica para mejorar la refrigeración.", "Soporte tecnológico"],
  ["Optimización de equipos", "Mejora del rendimiento y configuración de equipos.", "Soporte tecnológico"],
] as const;

const adminPassword = process.env.SEED_ADMIN_PASSWORD;
const userPassword = process.env.SEED_USER_PASSWORD;

if (!adminPassword || !userPassword) {
  throw new Error("SEED_ADMIN_PASSWORD y SEED_USER_PASSWORD son obligatorias para ejecutar el seed");
}

async function main() {
  for (const [index, [name, description, category]] of services.entries()) {
    await prisma.service.upsert({
      where: { id: index + 1 },
      update: { name, description, category },
      create: { id: index + 1, name, description, category },
    });
  }

  await prisma.user.upsert({
    where: { email: process.env.SEED_ADMIN_EMAIL ?? "admin.local@ventek.test" },
    update: { name: "Administrador local", role: "admin", passwordHash: await bcrypt.hash(adminPassword, 10) },
    create: {
      name: "Administrador local",
      email: process.env.SEED_ADMIN_EMAIL ?? "admin.local@ventek.test",
      role: "admin",
      passwordHash: await bcrypt.hash(adminPassword, 10),
    },
  });

  await prisma.user.upsert({
    where: { email: process.env.SEED_USER_EMAIL ?? "usuario.local@ventek.test" },
    update: { name: "Usuario local", role: "user", passwordHash: await bcrypt.hash(userPassword, 10) },
    create: {
      name: "Usuario local",
      email: process.env.SEED_USER_EMAIL ?? "usuario.local@ventek.test",
      role: "user",
      passwordHash: await bcrypt.hash(userPassword, 10),
    },
  });
}

main()
  .catch((error: unknown) => {
    console.error("No se pudo ejecutar el seed", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
