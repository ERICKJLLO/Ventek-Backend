export interface Interaction {
  id: number;
  userId: number;
  serviceId: number;
  message: string;
  createdAt: Date;
  service?: { id: number; name: string };
  user?: { id: number; name: string; email: string };
}
