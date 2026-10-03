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