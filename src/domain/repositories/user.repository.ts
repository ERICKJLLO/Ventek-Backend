import { User } from "../entities/user.js";

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: number): Promise<User | null>;

  create(
    name: string,
    email: string,
    passwordHash: string,
    role?: string,
  ): Promise<User>;
  updateProfile(id: number, data: { name: string; email: string; phone?: string | null }): Promise<User>;
  updatePassword(id: number, passwordHash: string): Promise<void>;
}