import { FastifyInstance } from 'fastify';
import { NoteController } from './note.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

export async function noteRoutes(app: FastifyInstance) {
  const controller = new NoteController();

  app.addHook('preHandler', authenticate);

  // Notes
  app.post('/', async (request, reply) => {
    return controller.create(request, reply);
  });

  app.get('/', async (request, reply) => {
    return controller.getAll(request, reply);
  });

  app.get('/search', async (request, reply) => {
    return controller.search(request, reply);
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

  // Folders
  app.post('/folders', async (request, reply) => {
    return controller.createFolder(request, reply);
  });

  app.get('/folders', async (request, reply) => {
    return controller.getFolders(request, reply);
  });

  app.patch('/folders/:id', async (request, reply) => {
    return controller.updateFolder(request, reply);
  });

  app.delete('/folders/:id', async (request, reply) => {
    return controller.deleteFolder(request, reply);
  });
}
