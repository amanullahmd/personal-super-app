import { prisma } from '../../config/database';
import { NotFoundError } from '../../shared/utils/errors';
import { paginate, paginatedResponse, PaginationParams } from '../../shared/utils/pagination';

export class TaskService {
  // --- Tasks ---
  async create(userId: string, data: {
    projectId?: string;
    title: string;
    description?: string;
    priority?: string;
    dueDate?: string;
    dueTime?: string;
    tags?: any;
    estimatedMinutes?: number;
    recurrence?: any;
    parentTaskId?: string;
  }) {
    return prisma.task.create({
      data: {
        userId,
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        priority: (data.priority as any) || 'medium',
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        dueTime: data.dueTime,
        tags: data.tags,
        estimatedMinutes: data.estimatedMinutes,
        recurrence: data.recurrence,
        parentTaskId: data.parentTaskId,
      },
      include: { project: true, subtasks: true },
    });
  }

  async getAll(userId: string, params: PaginationParams & {
    status?: string;
    priority?: string;
    projectId?: string;
  }) {
    const where: any = { userId };
    if (params.status) where.status = params.status;
    if (params.priority) where.priority = params.priority;
    if (params.projectId) where.projectId = params.projectId;

    const [data, total] = await Promise.all([
      prisma.task.findMany({
        where,
        ...paginate(params),
        include: { project: true, subtasks: true },
      }),
      prisma.task.count({ where }),
    ]);

    return paginatedResponse(data, total, params);
  }

  async getById(userId: string, id: string) {
    const task = await prisma.task.findFirst({
      where: { id, userId },
      include: { project: true, subtasks: true },
    });
    if (!task) throw new NotFoundError('Task');
    return task;
  }

  async update(userId: string, id: string, data: {
    title?: string;
    description?: string;
    priority?: string;
    status?: string;
    dueDate?: string;
    dueTime?: string;
    tags?: any;
    estimatedMinutes?: number;
    actualMinutes?: number;
    projectId?: string | null;
    parentTaskId?: string | null;
  }) {
    const task = await prisma.task.findFirst({ where: { id, userId } });
    if (!task) throw new NotFoundError('Task');

    return prisma.task.update({
      where: { id },
      data: {
        ...data,
        priority: data.priority as any,
        status: data.status as any,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
      include: { project: true, subtasks: true },
    });
  }

  async delete(userId: string, id: string) {
    const task = await prisma.task.findFirst({ where: { id, userId } });
    if (!task) throw new NotFoundError('Task');
    await prisma.task.delete({ where: { id } });
    return { message: 'Task deleted' };
  }

  async complete(userId: string, id: string) {
    const task = await prisma.task.findFirst({ where: { id, userId } });
    if (!task) throw new NotFoundError('Task');

    return prisma.task.update({
      where: { id },
      data: {
        status: 'done',
        completedAt: new Date(),
      },
      include: { project: true },
    });
  }

  async getToday(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return prisma.task.findMany({
      where: {
        userId,
        OR: [
          { dueDate: { gte: today, lt: tomorrow } },
          { status: { in: ['todo', 'in_progress'] } },
        ],
      },
      include: { project: true },
      orderBy: [
        { sortOrder: 'asc' },
        { priority: 'asc' },
        { dueDate: 'asc' },
      ],
    });
  }

  async reorder(userId: string, taskOrders: { id: string; sortOrder: number }[]) {
    const updates = taskOrders.map(({ id, sortOrder }) =>
      prisma.task.updateMany({
        where: { id, userId },
        data: { sortOrder },
      })
    );

    await prisma.$transaction(updates);
    return { message: 'Tasks reordered' };
  }

  // --- Projects ---
  async createProject(userId: string, data: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    deadline?: string;
  }) {
    return prisma.project.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        color: data.color || '#74B9FF',
        icon: data.icon || 'folder',
        deadline: data.deadline ? new Date(data.deadline) : undefined,
      },
    });
  }

  async getProjects(userId: string) {
    return prisma.project.findMany({
      where: { userId },
      include: {
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProject(userId: string, id: string) {
    const project = await prisma.project.findFirst({
      where: { id, userId },
      include: {
        tasks: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        },
      },
    });
    if (!project) throw new NotFoundError('Project');
    return project;
  }

  async updateProject(userId: string, id: string, data: {
    name?: string;
    description?: string;
    color?: string;
    icon?: string;
    status?: string;
    deadline?: string;
  }) {
    const project = await prisma.project.findFirst({ where: { id, userId } });
    if (!project) throw new NotFoundError('Project');

    return prisma.project.update({
      where: { id },
      data: {
        ...data,
        status: data.status as any,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
      },
    });
  }

  async deleteProject(userId: string, id: string) {
    const project = await prisma.project.findFirst({ where: { id, userId } });
    if (!project) throw new NotFoundError('Project');
    await prisma.project.delete({ where: { id } });
    return { message: 'Project deleted' };
  }
}
