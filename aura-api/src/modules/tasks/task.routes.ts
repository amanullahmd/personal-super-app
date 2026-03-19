import { FastifyInstance } from 'fastify';
import { TaskController } from './task.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

export async function taskRoutes(app: FastifyInstance) {
  const controller = new TaskController();

  app.addHook('preHandler', authenticate);

  // Tasks
  app.post('/', async (request, reply) => {
    return controller.create(request, reply);
  });

  app.get('/', async (request, reply) => {
    return controller.getAll(request, reply);
  });

  app.get('/today', async (request, reply) => {
    return controller.getToday(request, reply);
  });

  app.put('/reorder', async (request, reply) => {
    return controller.reorder(request, reply);
  });

  app.get('/:id', async (request, reply) => {
    return controller.getById(request, reply);
  });

  app.patch('/:id', async (request, reply) => {
    return controller.update(request, reply);
  });

  app.delete('/:id', async (request, reply) => {
    return controller.delete(request, reply);
  });

  app.post('/:id/complete', async (request, reply) => {
    return controller.complete(request, reply);
  });

  // Projects
  app.post('/projects', async (request, reply) => {
    return controller.createProject(request, reply);
  });

  app.get('/projects', async (request, reply) => {
    return controller.getProjects(request, reply);
  });

  app.get('/projects/:id', async (request, reply) => {
    return controller.getProject(request, reply);
  });

  app.patch('/projects/:id', async (request, reply) => {
    return controller.updateProject(request, reply);
  });

  app.delete('/projects/:id', async (request, reply) => {
    return controller.deleteProject(request, reply);
  });
}
