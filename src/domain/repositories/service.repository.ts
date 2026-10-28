import { Service } from "../entities/service.js";

export interface ServicePage {
  data: Service[];
  total: number;
}

export interface ServiceRepository {
  findPage(page: number, limit: number): Promise<ServicePage>;
  findById(id: number): Promise<Service | null>;
  create(data: Pick<Service, "name" | "description" | "category">): Promise<Service>;
  update(
    id: number,
    data: Partial<Pick<Service, "name" | "description" | "category">>,
  ): Promise<Service | null>;
  delete(id: number): Promise<boolean>;
}
