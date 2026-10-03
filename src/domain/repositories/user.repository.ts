import { User } from "../entities/user.js";

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;

  create(
    name: string,
    email: string,
    passwordHash: string,
    role?: string,
  ): Promise<User>;
}