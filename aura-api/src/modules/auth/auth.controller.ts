import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
} from './auth.schema';
import type { FastifyInstance } from 'fastify';

export class AuthController {
  private service: AuthService;

  constructor(app: FastifyInstance) {
    this.service = new AuthService(app);
  }

  async register(request: FastifyRequest, reply: FastifyReply) {
    const data = registerSchema.parse(request.body);
    const result = await this.service.register(data);
    return reply.status(201).send(result);
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    const data = loginSchema.parse(request.body);
    const result = await this.service.login(data);
    return reply.send(result);
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { refreshToken } = (request.body as any) || {};
    const result = await this.service.logout(userId, refreshToken);
    return reply.send(result);
  }

  async refreshToken(request: FastifyRequest, reply: FastifyReply) {
    const { refreshToken } = refreshTokenSchema.parse(request.body);
    const result = await this.service.refreshToken(refreshToken);
    return reply.send(result);
  }

  async forgotPassword(request: FastifyRequest, reply: FastifyReply) {
    const { email } = forgotPasswordSchema.parse(request.body);
    const result = await this.service.forgotPassword(email);
    return reply.send(result);
  }
}
