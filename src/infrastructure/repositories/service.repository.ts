import { prisma } from "../database/prisma.js";
import { ServiceRepository as ServiceRepositoryContract } from "../../domain/repositories/service.repository.js";

export class ServiceRepository implements ServiceRepositoryContract {
  async findPage(page: number, limit: number) {
    const [data, total] = await prisma.$transaction([
      prisma.service.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { id: "asc" },
      }),
      prisma.service.count(),
    ]);

    return { data, total };
  }

  findById(id: number) {
    return prisma.service.findUnique({ where: { id } });
  }

  create(data: { name: string; description: string; category: string }) {
    return prisma.service.create({ data });
  }

  async update(
    id: number,
    data: Partial<{ name: string; description: string; category: string }>,
  ) {
    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) return null;
    return prisma.service.update({ where: { id }, data });
  }

  async delete(id: number) {
    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) return false;
    await prisma.service.delete({ where: { id } });
    return true;
  }
}
