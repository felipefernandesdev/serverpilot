import { UserRepository } from '@serverpilot/domain/ports/repositories';
import { Email } from '@serverpilot/domain/value-objects/email';
import { User } from '@serverpilot/domain/entities/user';
import { InvalidCredentialsError, UserNotFoundError } from '@serverpilot/domain/errors';
import * as bcrypt from 'bcrypt';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
}

export class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
  ) {}

  async execute(request: LoginRequest): Promise<LoginResponse> {
    const email = Email.create(request.email);

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    if (!user.isActive) {
      throw new InvalidCredentialsError();
    }

    const isPasswordValid = await this.passwordService.compare(
      request.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new InvalidCredentialsError();
    }

    user.updateLastLogin();
    await this.userRepository.update(user);

    const accessToken = this.jwtService.generateAccessToken({
      sub: user.id,
      email: user.email.value,
      role: user.role,
    });

    const refreshToken = this.jwtService.generateRefreshToken({
      sub: user.id,
    });

    return {
      user: {
        id: user.id!,
        email: user.email.value,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }
}

export interface JwtService {
  generateAccessToken(payload: Record<string, unknown>): string;
  generateRefreshToken(payload: Record<string, unknown>): string;
  verifyAccessToken(token: string): Record<string, unknown>;
  verifyRefreshToken(token: string): Record<string, unknown>;
}

export interface PasswordService {
  hash(password: string): Promise<string>;
  compare(password: string, hashedPassword: string): Promise<boolean>;
}
