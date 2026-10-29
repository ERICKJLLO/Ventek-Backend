export interface User {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
}