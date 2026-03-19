import { FastifyRequest, FastifyReply } from 'fastify';
import { FinanceService } from './finance.service';
import { paginationSchema } from '../../shared/utils/pagination';

const service = new FinanceService();

export class FinanceController {
  // --- Accounts ---
  async createAccount(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const account = await service.createAccount(userId, request.body as any);
    return reply.status(201).send(account);
  }

  async getAccounts(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const accounts = await service.getAccounts(userId);
    return reply.send(accounts);
  }

  async getAccount(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const account = await service.getAccount(userId, id);
    return reply.send(account);
  }

  async updateAccount(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const account = await service.updateAccount(userId, id, request.body as any);
    return reply.send(account);
  }

  async deleteAccount(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const result = await service.deleteAccount(userId, id);
    return reply.send(result);
  }

  // --- Transactions ---
  async createTransaction(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const transaction = await service.createTransaction(userId, request.body as any);
    return reply.status(201).send(transaction);
  }

  async getTransactions(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const query = request.query as any;
    const pagination = paginationSchema.parse(query);
    const transactions = await service.getTransactions(userId, {
      ...pagination,
      accountId: query.accountId,
      type: query.type,
      category: query.category,
      from: query.from,
      to: query.to,
    });
    return reply.send(transactions);
  }

  async deleteTransaction(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const result = await service.deleteTransaction(userId, id);
    return reply.send(result);
  }

  // --- Budgets ---
  async createBudget(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const budget = await service.createBudget(userId, request.body as any);
    return reply.status(201).send(budget);
  }

  async getBudgets(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const query = request.query as any;
    const budgets = await service.getBudgets(userId, {
      month: query.month ? parseInt(query.month) : undefined,
      year: query.year ? parseInt(query.year) : undefined,
    });
    return reply.send(budgets);
  }

  async updateBudget(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const budget = await service.updateBudget(userId, id, request.body as any);
    return reply.send(budget);
  }

  async deleteBudget(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const result = await service.deleteBudget(userId, id);
    return reply.send(result);
  }

  // --- Savings Goals ---
  async createSavingsGoal(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const goal = await service.createSavingsGoal(userId, request.body as any);
    return reply.status(201).send(goal);
  }

  async getSavingsGoals(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const goals = await service.getSavingsGoals(userId);
    return reply.send(goals);
  }

  async updateSavingsGoal(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const goal = await service.updateSavingsGoal(userId, id, request.body as any);
    return reply.send(goal);
  }

  async contributeSavings(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const { amount } = request.body as { amount: number };
    const goal = await service.contributeSavings(userId, id, amount);
    return reply.send(goal);
  }

  async deleteSavingsGoal(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const { id } = request.params as { id: string };
    const result = await service.deleteSavingsGoal(userId, id);
    return reply.send(result);
  }

  // --- Summary ---
  async getSummary(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).user.sub;
    const query = request.query as any;
    const now = new Date();
    const month = query.month ? parseInt(query.month) : now.getMonth() + 1;
    const year = query.year ? parseInt(query.year) : now.getFullYear();
    const summary = await service.getSummary(userId, month, year);
    return reply.send(summary);
  }
}
