import { FastifyInstance } from 'fastify';
import { FinanceController } from './finance.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

export async function financeRoutes(app: FastifyInstance) {
  const controller = new FinanceController();

  app.addHook('preHandler', authenticate);

  // Summary
  app.get('/summary', async (request, reply) => {
    return controller.getSummary(request, reply);
  });

  // Accounts
  app.post('/accounts', async (request, reply) => {
    return controller.createAccount(request, reply);
  });

  app.get('/accounts', async (request, reply) => {
    return controller.getAccounts(request, reply);
  });

  app.get('/accounts/:id', async (request, reply) => {
    return controller.getAccount(request, reply);
  });

  app.patch('/accounts/:id', async (request, reply) => {
    return controller.updateAccount(request, reply);
  });

  app.delete('/accounts/:id', async (request, reply) => {
    return controller.deleteAccount(request, reply);
  });

  // Transactions
  app.post('/transactions', async (request, reply) => {
    return controller.createTransaction(request, reply);
  });

  app.get('/transactions', async (request, reply) => {
    return controller.getTransactions(request, reply);
  });

  app.delete('/transactions/:id', async (request, reply) => {
    return controller.deleteTransaction(request, reply);
  });

  // Budgets
  app.post('/budgets', async (request, reply) => {
    return controller.createBudget(request, reply);
  });

  app.get('/budgets', async (request, reply) => {
    return controller.getBudgets(request, reply);
  });

  app.patch('/budgets/:id', async (request, reply) => {
    return controller.updateBudget(request, reply);
  });

  app.delete('/budgets/:id', async (request, reply) => {
    return controller.deleteBudget(request, reply);
  });

  // Savings Goals
  app.post('/savings', async (request, reply) => {
    return controller.createSavingsGoal(request, reply);
  });

  app.get('/savings', async (request, reply) => {
    return controller.getSavingsGoals(request, reply);
  });

  app.patch('/savings/:id', async (request, reply) => {
    return controller.updateSavingsGoal(request, reply);
  });

  app.post('/savings/:id/contribute', async (request, reply) => {
    return controller.contributeSavings(request, reply);
  });

  app.delete('/savings/:id', async (request, reply) => {
    return controller.deleteSavingsGoal(request, reply);
  });
}
