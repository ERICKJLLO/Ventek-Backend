import bcrypt from "bcrypt";
import { RegisterUserDto } from "../dto/register-user.dto.js";
import { UserRepository } from "../../domain/repositories/user.repository.js";

export class RegisterUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(data: RegisterUserDto) {
    const existingUser = await this.userRepository.findByEmail(data.email);

    if (existingUser) {
      throw new Error("El correo electrónico ya está registrado");
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await this.userRepository.create(
      data.name,
      data.email,
      passwordHash,
      "user",
    );

    return user;
  }
}