import { prisma } from "../database/prisma.js";
import { UserRepository as UserRepositoryContract } from "../../domain/repositories/user.repository.js";

export class UserRepository implements UserRepositoryContract {
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

  async findById(id: number) {
    return prisma.user.findUnique({ where: { id } });
  }

  async create(
    name: string,
    email: string,
    passwordHash: string,
    role: string = "user",
  ) {
    return prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
      },
    });
  }

  async updateProfile(id: number, data: { name: string; email: string; phone?: string | null }) {
    return prisma.user.update({ where: { id }, data });
  }

  async updatePassword(id: number, passwordHash: string) {
    await prisma.user.update({ where: { id }, data: { passwordHash } });
  }
}