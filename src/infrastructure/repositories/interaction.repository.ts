import { prisma } from "../database/prisma.js";
import { InteractionRepository as InteractionRepositoryContract } from "../../domain/repositories/interaction.repository.js";

export class InteractionRepository implements InteractionRepositoryContract {
  create(userId: number, serviceId: number, message: string) {
    return prisma.interaction.create({
      data: { userId, serviceId, message },
      include: { service: { select: { id: true, name: true } } },
    });
  }

  findByUserId(userId: number) {
    return prisma.interaction.findMany({
      where: { userId },
      include: { service: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  findAll() {
    return prisma.interaction.findMany({
      include: {
        service: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
