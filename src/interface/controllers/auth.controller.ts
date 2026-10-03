import { Request, Response } from "express";
import { RegisterUserUseCase } from "../../application/use-cases/register-user.use-case.js";
import { UserRepository } from "../../infrastructure/repositories/user.repository.js";

const userRepository = new UserRepository();
const registerUserUseCase = new RegisterUserUseCase(userRepository);

export class AuthController {
  async register(req: Request, res: Response) {
    const user = await registerUserUseCase.execute(req.body);

    return res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  }
}