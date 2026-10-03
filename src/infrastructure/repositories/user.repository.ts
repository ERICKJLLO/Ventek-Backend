import { prisma } from "../database/prisma.js";

export class UserRepository {
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: {
        email,
      },
    });
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
}