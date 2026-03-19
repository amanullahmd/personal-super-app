import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../shared/utils/errors';
import type { RegisterInput, LoginInput } from './auth.schema';
import type { FastifyInstance } from 'fastify';

const SALT_ROUNDS = 12;

export class AuthService {
  constructor(private app: FastifyInstance) {}

  async register(data: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new ConflictError('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        gender: data.gender,
        timezone: data.timezone,
        locale: data.locale,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        subscriptionTier: true,
        createdAt: true,
      },
    });

    // Create default preferences
    await prisma.userPreference.create({
      data: { userId: user.id },
    });

    // Create initial XP record
    await prisma.userXp.create({
      data: { userId: user.id },
    });

    const tokens = await this.generateTokens(user.id);

    return { user, ...tokens };
  }

  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        passwordHash: true,
        subscriptionTier: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    const validPassword = await bcrypt.compare(data.password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id);

    const { passwordHash: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, ...tokens };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { userId, token: refreshToken },
      });
    } else {
      // Revoke all refresh tokens for the user
      await prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }
    return { message: 'Logged out successfully' };
  }

  async refreshToken(token: string) {
    const stored = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { select: { id: true, isActive: true } } },
    });

    if (!stored) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (stored.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new UnauthorizedError('Refresh token has expired');
    }

    if (!stored.user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Rotate refresh token
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const tokens = await this.generateTokens(stored.userId);
    return tokens;
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return success even if user not found to prevent enumeration
      return { message: 'If an account exists with this email, a reset link has been sent' };
    }

    // In production, generate a reset token and send email
    // For now, just acknowledge the request
    return { message: 'If an account exists with this email, a reset link has been sent' };
  }

  private async generateTokens(userId: string) {
    const accessToken = this.app.jwt.sign(
      { sub: userId },
      { expiresIn: env.jwt.expiresIn }
    );

    const refreshTokenValue = uuidv4();
    const refreshExpiresMs = this.parseExpiry(env.jwt.refreshExpiresIn);

    await prisma.refreshToken.create({
      data: {
        userId,
        token: refreshTokenValue,
        expiresAt: new Date(Date.now() + refreshExpiresMs),
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
    };
  }

  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 30 * 24 * 60 * 60 * 1000; // default 30 days
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return value * (multipliers[unit] || 1000);
  }
}
