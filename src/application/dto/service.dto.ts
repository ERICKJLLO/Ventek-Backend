export interface CreateServiceDto {
  name: string;
  description: string;
  category: string;
}

export type UpdateServiceDto = Partial<CreateServiceDto>;
