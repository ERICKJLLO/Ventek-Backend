import { Interaction } from "../entities/interaction.js";

export interface InteractionRepository {
  create(userId: number, serviceId: number, message: string): Promise<Interaction>;
  findByUserId(userId: number): Promise<Interaction[]>;
  findAll(): Promise<Interaction[]>;
}
