import bcrypt from "bcrypt";
import { LoginUserDto } from "../dto/login-user.dto.js";
import { UnauthorizedError } from "../errors/unauthorized.error.js";
import { UserRepository } from "../../domain/repositories/user.repository.js";

export class LoginUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(data: LoginUserDto) {
    const user = await this.userRepository.findByEmail(data.email);

    if (!user) {
      throw new UnauthorizedError("Credenciales inválidas");
    }

    const passwordIsValid = await bcrypt.compare(
      data.password,
      user.passwordHash,
    );

    if (!passwordIsValid) {
      throw new UnauthorizedError("Credenciales inválidas");
    }

    return user;
  }
}