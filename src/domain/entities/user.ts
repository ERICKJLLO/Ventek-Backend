export interface User {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}