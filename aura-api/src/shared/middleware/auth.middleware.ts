import { FastifyRequest, FastifyReply } from 'fastify';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}

export async function optionalAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    // Continue without auth — user will be null
  }
}

export async function requirePro(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply);
  const user = (request as any).user;
  if (!user || user.subscriptionTier === 'free') {
    reply.status(403).send({
      error: 'Pro Required',
      message: 'This feature requires an Aura Pro subscription',
    });
  }
}
