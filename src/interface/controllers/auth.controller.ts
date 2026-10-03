import { Request, Response } from "express";
import { RegisterUserUseCase } from "../../application/use-cases/register-user.use-case.js";
import { LoginUserUseCase } from "../../application/use-cases/login-user.use-case.js";
import { UserRepository } from "../../infrastructure/repositories/user.repository.js";
import { ValidationError } from "../../application/errors/validation.error.js";
import { generateToken } from "../../infrastructure/config/jwt.service.js";

const userRepository = new UserRepository();
const registerUserUseCase = new RegisterUserUseCase(userRepository);
const loginUserUseCase = new LoginUserUseCase(userRepository);

export class AuthController {
  async register(req: Request, res: Response) {
    const { name, email, password } = req.body;

    if (typeof name !== "string" || name.trim().length < 3) {
      throw new ValidationError(
        "El nombre debe tener al menos 3 caracteres",
      );
    }

    if (
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      throw new ValidationError("El correo electrónico no es válido");
    }

    if (typeof password !== "string" || password.length < 8) {
      throw new ValidationError(
        "La contraseña debe tener al menos 8 caracteres",
      );
    }

    const user = await registerUserUseCase.execute({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    });

    return res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  }

  async login(req: Request, res: Response) {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      throw new ValidationError("El correo electrónico no es válido");
    }

    if (typeof password !== "string" || password.length === 0) {
      throw new ValidationError("La contraseña es obligatoria");
    }

    const user = await loginUserUseCase.execute({
      email: email.trim().toLowerCase(),
      password,
    });
    
    const token = generateToken({
      id: user.id,
      role: user.role,
    });
    
    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  }
}