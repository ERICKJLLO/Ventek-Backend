import { InteractionRepository } from "../../domain/repositories/interaction.repository.js";
import { ServiceRepository } from "../../domain/repositories/service.repository.js";
import { CreateInteractionDto } from "../dto/interaction.dto.js";
import { NotFoundError } from "../errors/not-found.error.js";

export class CreateInteractionUseCase {
  constructor(
    private interactions: InteractionRepository,
    private services: ServiceRepository,
  ) {}

  async execute(userId: number, data: CreateInteractionDto) {
    if (!(await this.services.findById(data.serviceId))) {
      throw new NotFoundError("Servicio no encontrado");
    }
    return this.interactions.create(userId, data.serviceId, data.message);
  }
}

export class ListOwnInteractionsUseCase {
  constructor(private repository: InteractionRepository) {}
  execute(userId: number) {
    return this.repository.findByUserId(userId);
  }
}

export class ListAllInteractionsUseCase {
  constructor(private repository: InteractionRepository) {}
  execute() {
    return this.repository.findAll();
  }
}
