import { prisma } from '../../config/database';
import { NotFoundError } from '../../shared/utils/errors';
import { paginate, paginatedResponse, PaginationParams } from '../../shared/utils/pagination';

export class FinanceService {
  // --- Accounts ---
  async createAccount(userId: string, data: {
    name: string;
    type: string;
    currency?: string;
    balance?: number;
    icon?: string;
    color?: string;
  }) {
    return prisma.financialAccount.create({
      data: {
        userId,
        name: data.name,
        type: data.type as any,
        currency: data.currency || 'USD',
        balance: data.balance || 0,
        icon: data.icon || 'wallet',
        color: data.color || '#00D2FF',
      },
    });
  }

  async getAccounts(userId: string) {
    return prisma.financialAccount.findMany({
      where: { userId, isActive: true },
      include: { _count: { select: { transactions: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async getAccount(userId: string, id: string) {
    const account = await prisma.financialAccount.findFirst({
      where: { id, userId },
      include: {
        transactions: { orderBy: { transactionDate: 'desc' }, take: 20 },
      },
    });
    if (!account) throw new NotFoundError('Financial account');
    return account;
  }

  async updateAccount(userId: string, id: string, data: {
    name?: string;
    type?: string;
    currency?: string;
    icon?: string;
    color?: string;
    isActive?: boolean;
  }) {
    const account = await prisma.financialAccount.findFirst({ where: { id, userId } });
    if (!account) throw new NotFoundError('Financial account');

    return prisma.financialAccount.update({
      where: { id },
      data: { ...data, type: data.type as any },
    });
  }

  async deleteAccount(userId: string, id: string) {
    const account = await prisma.financialAccount.findFirst({ where: { id, userId } });
    if (!account) throw new NotFoundError('Financial account');
    await prisma.financialAccount.update({
      where: { id },
      data: { isActive: false },
    });
    return { message: 'Account deactivated' };
  }

  // --- Transactions ---
  async createTransaction(userId: string, data: {
    accountId: string;
    type: string;
    amount: number;
    currency?: string;
    category: string;
    description?: string;
    isRecurring?: boolean;
    recurrenceRule?: string;
    transactionDate: string;
  }) {
    const account = await prisma.financialAccount.findFirst({
      where: { id: data.accountId, userId },
    });
    if (!account) throw new NotFoundError('Financial account');

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        accountId: data.accountId,
        type: data.type as any,
        amount: data.amount,
        currency: data.currency || account.currency,
        category: data.category as any,
        description: data.description,
        isRecurring: data.isRecurring || false,
        recurrenceRule: data.recurrenceRule,
        transactionDate: new Date(data.transactionDate),
      },
    });

    // Update account balance
    const balanceChange = data.type === 'income' ? data.amount :
                          data.type === 'expense' ? -data.amount : 0;

    if (balanceChange !== 0) {
      await prisma.financialAccount.update({
        where: { id: data.accountId },
        data: { balance: { increment: balanceChange } },
      });
    }

    return transaction;
  }

  async getTransactions(userId: string, params: PaginationParams & {
    accountId?: string;
    type?: string;
    category?: string;
    from?: string;
    to?: string;
  }) {
    const where: any = { userId };
    if (params.accountId) where.accountId = params.accountId;
    if (params.type) where.type = params.type;
    if (params.category) where.category = params.category;
    if (params.from || params.to) {
      where.transactionDate = {};
      if (params.from) where.transactionDate.gte = new Date(params.from);
      if (params.to) where.transactionDate.lte = new Date(params.to);
    }

    const [data, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        ...paginate(params),
        orderBy: { transactionDate: 'desc' },
        include: { account: { select: { id: true, name: true, type: true } } },
      }),
      prisma.transaction.count({ where }),
    ]);

    return paginatedResponse(data, total, params);
  }

  async deleteTransaction(userId: string, id: string) {
    const transaction = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!transaction) throw new NotFoundError('Transaction');

    // Reverse balance effect
    const balanceChange = transaction.type === 'income' ? -transaction.amount :
                          transaction.type === 'expense' ? transaction.amount : 0;

    if (balanceChange !== 0) {
      await prisma.financialAccount.update({
        where: { id: transaction.accountId },
        data: { balance: { increment: balanceChange } },
      });
    }

    await prisma.transaction.delete({ where: { id } });
    return { message: 'Transaction deleted' };
  }

  // --- Budgets ---
  async createBudget(userId: string, data: {
    category: string;
    amountLimit: number;
    period: string;
    alertThresholdPercent?: number;
    month: number;
    year: number;
  }) {
    return prisma.budget.create({
      data: {
        userId,
        category: data.category as any,
        amountLimit: data.amountLimit,
        period: data.period as any,
        alertThresholdPercent: data.alertThresholdPercent || 80,
        month: data.month,
        year: data.year,
      },
    });
  }

  async getBudgets(userId: string, params: { month?: number; year?: number }) {
    const where: any = { userId };
    if (params.month) where.month = params.month;
    if (params.year) where.year = params.year;

    const budgets = await prisma.budget.findMany({
      where,
      orderBy: { category: 'asc' },
    });

    // Calculate spending for each budget
    const budgetsWithSpending = await Promise.all(
      budgets.map(async (budget) => {
        const startDate = new Date(budget.year, budget.month - 1, 1);
        const endDate = new Date(budget.year, budget.month, 0);

        const spending = await prisma.transaction.aggregate({
          where: {
            userId,
            category: budget.category,
            type: 'expense',
            transactionDate: { gte: startDate, lte: endDate },
          },
          _sum: { amount: true },
        });

        const spent = spending._sum.amount || 0;
        return {
          ...budget,
          spent,
          remaining: budget.amountLimit - spent,
          percentUsed: Math.round((spent / budget.amountLimit) * 100),
        };
      })
    );

    return budgetsWithSpending;
  }

  async updateBudget(userId: string, id: string, data: {
    amountLimit?: number;
    alertThresholdPercent?: number;
  }) {
    const budget = await prisma.budget.findFirst({ where: { id, userId } });
    if (!budget) throw new NotFoundError('Budget');

    return prisma.budget.update({ where: { id }, data });
  }

  async deleteBudget(userId: string, id: string) {
    const budget = await prisma.budget.findFirst({ where: { id, userId } });
    if (!budget) throw new NotFoundError('Budget');
    await prisma.budget.delete({ where: { id } });
    return { message: 'Budget deleted' };
  }

  // --- Savings Goals ---
  async createSavingsGoal(userId: string, data: {
    name: string;
    targetAmount: number;
    targetDate?: string;
    autoSaveAmount?: number;
    autoSaveFrequency?: string;
  }) {
    return prisma.savingsGoal.create({
      data: {
        userId,
        name: data.name,
        targetAmount: data.targetAmount,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
        autoSaveAmount: data.autoSaveAmount,
        autoSaveFrequency: data.autoSaveFrequency,
      },
    });
  }

  async getSavingsGoals(userId: string) {
    return prisma.savingsGoal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateSavingsGoal(userId: string, id: string, data: {
    name?: string;
    targetAmount?: number;
    currentAmount?: number;
    targetDate?: string;
    autoSaveAmount?: number;
    autoSaveFrequency?: string;
    status?: string;
  }) {
    const goal = await prisma.savingsGoal.findFirst({ where: { id, userId } });
    if (!goal) throw new NotFoundError('Savings goal');

    return prisma.savingsGoal.update({
      where: { id },
      data: {
        ...data,
        status: data.status as any,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
      },
    });
  }

  async contributeSavings(userId: string, id: string, amount: number) {
    const goal = await prisma.savingsGoal.findFirst({ where: { id, userId } });
    if (!goal) throw new NotFoundError('Savings goal');

    const updated = await prisma.savingsGoal.update({
      where: { id },
      data: {
        currentAmount: { increment: amount },
      },
    });

    // Auto-complete if target reached
    if (updated.currentAmount >= updated.targetAmount) {
      await prisma.savingsGoal.update({
        where: { id },
        data: { status: 'completed' },
      });
    }

    return updated;
  }

  async deleteSavingsGoal(userId: string, id: string) {
    const goal = await prisma.savingsGoal.findFirst({ where: { id, userId } });
    if (!goal) throw new NotFoundError('Savings goal');
    await prisma.savingsGoal.delete({ where: { id } });
    return { message: 'Savings goal deleted' };
  }

  // --- Summary ---
  async getSummary(userId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const [income, expenses, accounts] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId,
          type: 'income',
          transactionDate: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          type: 'expense',
          transactionDate: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),
      prisma.financialAccount.findMany({
        where: { userId, isActive: true },
        select: { id: true, name: true, type: true, balance: true, currency: true },
      }),
    ]);

    const totalIncome = income._sum.amount || 0;
    const totalExpenses = expenses._sum.amount || 0;
    const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

    return {
      month,
      year,
      totalIncome,
      totalExpenses,
      netSavings: totalIncome - totalExpenses,
      totalBalance,
      accounts,
    };
  }
}
