import { Request, Response } from "express";
import { ValidationError } from "../../application/errors/validation.error.js";
import {
  CreateServiceUseCase,
  DeleteServiceUseCase,
  GetServiceUseCase,
  ListServicesUseCase,
  UpdateServiceUseCase,
} from "../../application/use-cases/service.use-cases.js";
import { ServiceRepository } from "../../infrastructure/repositories/service.repository.js";

const repository = new ServiceRepository();
const listServices = new ListServicesUseCase(repository);
const getService = new GetServiceUseCase(repository);
const createService = new CreateServiceUseCase(repository);
const updateService = new UpdateServiceUseCase(repository);
const deleteService = new DeleteServiceUseCase(repository);

function parseId(value: string | string[]) {
  if (Array.isArray(value)) throw new ValidationError("El identificador no es válido");
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    throw new ValidationError("El identificador no es válido");
  }
  return id;
}

function serviceData(body: unknown, partial = false) {
  if (!body || typeof body !== "object") {
    throw new ValidationError("Los datos del servicio son obligatorios");
  }
  const input = body as Record<string, unknown>;
  const data = {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.category !== undefined ? { category: input.category } : {}),
  };
  for (const field of ["name", "description", "category"]) {
    if (!partial && !(field in data)) {
      throw new ValidationError(`El campo ${field} es obligatorio`);
    }
    if (field in data && (typeof data[field as keyof typeof data] !== "string" ||
      !(data[field as keyof typeof data] as string).trim())) {
      throw new ValidationError(`El campo ${field} no es válido`);
    }
  }
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, (value as string).trim()]),
  ) as { name?: string; description?: string; category?: string };
}

export class ServiceController {
  async list(req: Request, res: Response) {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 6);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new ValidationError("Los parámetros page y limit no son válidos");
    }
    const result = await listServices.execute(page, limit);
    return res.json({
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
      data: result.data,
    });
  }

  async get(req: Request, res: Response) {
    return res.json(await getService.execute(parseId(req.params.id)));
  }

  async create(req: Request, res: Response) {
    return res.status(201).json(await createService.execute(serviceData(req.body) as {
      name: string; description: string; category: string;
    }));
  }

  async update(req: Request, res: Response) {
    const data = serviceData(req.body, true);
    if (Object.keys(data).length === 0) throw new ValidationError("Debe enviar al menos un campo");
    return res.json(await updateService.execute(parseId(req.params.id), data));
  }

  async delete(req: Request, res: Response) {
    await deleteService.execute(parseId(req.params.id));
    return res.status(204).send();
  }
}
