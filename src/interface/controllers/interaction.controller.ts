import { Request, Response } from "express";
import { ValidationError } from "../../application/errors/validation.error.js";
import {
  CreateInteractionUseCase,
  ListAllInteractionsUseCase,
  ListOwnInteractionsUseCase,
} from "../../application/use-cases/interaction.use-cases.js";
import { InteractionRepository } from "../../infrastructure/repositories/interaction.repository.js";
import { ServiceRepository } from "../../infrastructure/repositories/service.repository.js";
import { getAuthenticatedRequest } from "../middlewares/auth.middleware.js";

const interactionRepository = new InteractionRepository();
const createInteraction = new CreateInteractionUseCase(
  interactionRepository,
  new ServiceRepository(),
);
const listOwnInteractions = new ListOwnInteractionsUseCase(interactionRepository);
const listAllInteractions = new ListAllInteractionsUseCase(interactionRepository);

export class InteractionController {
  async create(req: Request, res: Response) {
    const body = req.body as Record<string, unknown>;
    const serviceId = Number(body.serviceId);
    if (!Number.isInteger(serviceId) || serviceId < 1 ||
      typeof body.message !== "string" || !body.message.trim()) {
      throw new ValidationError("serviceId y message son obligatorios y válidos");
    }
    const request = getAuthenticatedRequest(req);
    const interaction = await createInteraction.execute(request.userId, {
      serviceId,
      message: body.message.trim(),
    });
    return res.status(201).json(interaction);
  }

  async mine(req: Request, res: Response) {
    return res.json(await listOwnInteractions.execute(getAuthenticatedRequest(req).userId));
  }

  async all(_req: Request, res: Response) {
    return res.json(await listAllInteractions.execute());
  }
}
