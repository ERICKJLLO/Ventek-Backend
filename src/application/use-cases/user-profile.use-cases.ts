import bcrypt from "bcrypt";
import { ConflictError } from "../errors/conflict.error.js";
import { UnauthorizedError } from "../errors/unauthorized.error.js";
import { UserRepository } from "../../domain/repositories/user.repository.js";

export class GetUserProfileUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(userId: number) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new UnauthorizedError("La sesión no pertenece a un usuario válido");
    return user;
  }
}

export class UpdateUserProfileUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(userId: number, data: { name: string; email: string; phone?: string | null }) {
    const existing = await this.userRepository.findByEmail(data.email);
    if (existing && existing.id !== userId) {
      throw new ConflictError("El correo electrónico ya está registrado");
    }
    return this.userRepository.updateProfile(userId, data);
  }
}

export class ChangeUserPasswordUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new UnauthorizedError("La sesión no pertenece a un usuario válido");
    if (!await bcrypt.compare(currentPassword, user.passwordHash)) {
      throw new UnauthorizedError("La contraseña actual no es correcta");
    }

    await this.userRepository.updatePassword(userId, await bcrypt.hash(newPassword, 10));
  }
}
