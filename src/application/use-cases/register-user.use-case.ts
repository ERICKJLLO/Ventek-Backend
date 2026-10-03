import bcrypt from "bcrypt";
import { UserRepository } from "../../domain/repositories/user.repository.js";

export class RegisterUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(name: string, email: string, password: string) {
    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      throw new Error("El correo electrónico ya está registrado");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.userRepository.create(
      name,
      email,
      passwordHash,
      "user",
    );

    return user;
  }
}