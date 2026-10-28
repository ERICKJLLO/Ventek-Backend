import { ServiceRepository } from "../../domain/repositories/service.repository.js";
import { CreateServiceDto, UpdateServiceDto } from "../dto/service.dto.js";
import { NotFoundError } from "../errors/not-found.error.js";

export class ListServicesUseCase {
  constructor(private repository: ServiceRepository) {}

  execute(page: number, limit: number) {
    return this.repository.findPage(page, limit);
  }
}

export class GetServiceUseCase {
  constructor(private repository: ServiceRepository) {}

  async execute(id: number) {
    const service = await this.repository.findById(id);
    if (!service) throw new NotFoundError("Servicio no encontrado");
    return service;
  }
}

export class CreateServiceUseCase {
  constructor(private repository: ServiceRepository) {}

  execute(data: CreateServiceDto) {
    return this.repository.create(data);
  }
}

export class UpdateServiceUseCase {
  constructor(private repository: ServiceRepository) {}

  async execute(id: number, data: UpdateServiceDto) {
    const service = await this.repository.update(id, data);
    if (!service) throw new NotFoundError("Servicio no encontrado");
    return service;
  }
}

export class DeleteServiceUseCase {
  constructor(private repository: ServiceRepository) {}

  async execute(id: number) {
    const deleted = await this.repository.delete(id);
    if (!deleted) throw new NotFoundError("Servicio no encontrado");
  }
}
