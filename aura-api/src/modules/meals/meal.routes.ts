import { FastifyInstance } from 'fastify';
import { MealController } from './meal.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

export async function mealRoutes(app: FastifyInstance) {
  const controller = new MealController();

  app.addHook('preHandler', authenticate);

  // Meal Logs
  app.post('/logs', async (request, reply) => {
    return controller.createMealLog(request, reply);
  });

  app.get('/logs', async (request, reply) => {
    return controller.getMealLogs(request, reply);
  });

  app.get('/logs/:id', async (request, reply) => {
    return controller.getMealLog(request, reply);
  });

  app.delete('/logs/:id', async (request, reply) => {
    return controller.deleteMealLog(request, reply);
  });

  // Water
  app.post('/water', async (request, reply) => {
    return controller.createWaterLog(request, reply);
  });

  app.get('/water', async (request, reply) => {
    return controller.getWaterLogs(request, reply);
  });

  // Meal Plans
  app.post('/plans', async (request, reply) => {
    return controller.createMealPlan(request, reply);
  });

  app.get('/plans', async (request, reply) => {
    return controller.getMealPlans(request, reply);
  });

  app.get('/plans/:id', async (request, reply) => {
    return controller.getMealPlan(request, reply);
  });

  app.patch('/plans/:id', async (request, reply) => {
    return controller.updateMealPlan(request, reply);
  });

  app.delete('/plans/:id', async (request, reply) => {
    return controller.deleteMealPlan(request, reply);
  });

  // Food Search
  app.get('/food/search', async (request, reply) => {
    return controller.searchFood(request, reply);
  });

  // Daily Summary
  app.get('/summary', async (request, reply) => {
    return controller.getDailySummary(request, reply);
  });
}
