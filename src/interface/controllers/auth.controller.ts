import { Request, Response } from "express";
import { RegisterUserUseCase } from "../../application/use-cases/register-user.use-case.js";
import { LoginUserUseCase } from "../../application/use-cases/login-user.use-case.js";
import { UserRepository } from "../../infrastructure/repositories/user.repository.js";
import { ValidationError } from "../../application/errors/validation.error.js";
import { generateToken } from "../../infrastructure/config/jwt.service.js";
import { getAuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { ChangeUserPasswordUseCase, GetUserProfileUseCase, UpdateUserProfileUseCase } from "../../application/use-cases/user-profile.use-cases.js";

const userRepository = new UserRepository();
const registerUserUseCase = new RegisterUserUseCase(userRepository);
const loginUserUseCase = new LoginUserUseCase(userRepository);
const getUserProfileUseCase = new GetUserProfileUseCase(userRepository);
const updateUserProfileUseCase = new UpdateUserProfileUseCase(userRepository);
const changeUserPasswordUseCase = new ChangeUserPasswordUseCase(userRepository);

function publicUser(user: { id: number; name: string; email: string; role: string; phone?: string | null }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone ?? null,
  };
}

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

    return res.status(201).json(publicUser(user));
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
      user: publicUser(user),
    });
  }

  async me(req: Request, res: Response) {
    return res.json(publicUser(await getUserProfileUseCase.execute(getAuthenticatedRequest(req).userId)));
  }

  async updateMe(req: Request, res: Response) {
    const body = req.body as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    let phone: string | null | undefined;
    if (!Object.hasOwn(body, "phone") || body.phone === undefined) {
      phone = undefined;
    } else if (body.phone === null) {
      phone = null;
    } else if (typeof body.phone === "string") {
      phone = body.phone.trim();
    } else {
      throw new ValidationError("El número de teléfono no es válido");
    }
    if (name.length < 3) throw new ValidationError("El nombre debe tener al menos 3 caracteres");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError("El correo electrónico no es válido");
    const user = await updateUserProfileUseCase.execute(getAuthenticatedRequest(req).userId, { name, email, phone });
    return res.json(publicUser(user));
  }

  async changePassword(req: Request, res: Response) {
    const body = req.body as Record<string, unknown>;
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    if (!currentPassword) throw new ValidationError("La contraseña actual es obligatoria");
    if (newPassword.length < 8) throw new ValidationError("La nueva contraseña debe tener al menos 8 caracteres");
    await changeUserPasswordUseCase.execute(getAuthenticatedRequest(req).userId, currentPassword, newPassword);
    return res.status(204).send();
  }
}