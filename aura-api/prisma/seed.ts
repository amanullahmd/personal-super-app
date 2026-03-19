import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function daysAgo(n: number, hour = 0): Date {
  const d = new Date(); d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() - n); return d;
}

async function main() {
  console.log('🌱 Seeding database...');

  // ── User ──────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Demo1234!', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@aura.app' },
    update: { passwordHash },
    create: {
      email: 'demo@aura.app',
      fullName: 'Demo User',
      passwordHash,
      subscriptionTier: 'pro',
      isActive: true,
      onboardingCompleted: true,
      timezone: 'UTC',
      locale: 'en',
    },
  });
  const uid = user.id;
  console.log('✅ User:', user.email, uid);

  // ── Health Profile ─────────────────────────────────────────────────────────
  await prisma.healthProfile.upsert({
    where: { userId: uid },
    update: {},
    create: {
      userId: uid,
      heightCm: 178,
      weightKg: 74.5,
      bloodType: 'A+',
      fitnessLevel: 'intermediate',
      dailyCalorieGoal: 2200,
      dailyWaterGoalMl: 2000,
      dailyStepsGoal: 10000,
      sleepGoalHours: 8,
    },
  });

  // Health Logs (steps + heart_rate last 7 days)
  for (let i = 6; i >= 0; i--) {
    await prisma.healthLog.create({ data: { userId: uid, metricType: 'steps', value: 7000 + Math.floor(Math.random() * 4000), unit: 'steps', loggedAt: daysAgo(i, 20) } });
    await prisma.healthLog.create({ data: { userId: uid, metricType: 'heart_rate', value: 62 + Math.floor(Math.random() * 10), unit: 'bpm', loggedAt: daysAgo(i, 8) } });
    await prisma.healthLog.create({ data: { userId: uid, metricType: 'weight', value: 74.0 + Math.random() * 1.5, unit: 'kg', loggedAt: daysAgo(i, 7) } });
  }

  // Workouts (last 5 days)
  const workouts = [
    { workoutType: 'running', title: 'Morning Run', durationMinutes: 45, caloriesBurned: 420, intensity: 'medium' },
    { workoutType: 'strength', title: 'Upper Body Gym', durationMinutes: 55, caloriesBurned: 340, intensity: 'high' },
    { workoutType: 'cycling', title: 'Evening Ride', durationMinutes: 75, caloriesBurned: 540, intensity: 'medium' },
    { workoutType: 'cardio', title: 'HIIT Session', durationMinutes: 50, caloriesBurned: 380, intensity: 'high' },
    { workoutType: 'yoga', title: 'Morning Yoga', durationMinutes: 30, caloriesBurned: 160, intensity: 'low' },
  ];
  for (let i = 0; i < workouts.length; i++) {
    const w = workouts[i];
    await prisma.workout.create({
      data: { userId: uid, workoutType: w.workoutType as any, title: w.title, durationMinutes: w.durationMinutes, caloriesBurned: w.caloriesBurned, intensity: w.intensity as any, completedAt: daysAgo(i, 7) },
    });
  }

  // Sleep Logs (last 7 days)
  for (let i = 6; i >= 0; i--) {
    const dur = 390 + Math.floor(Math.random() * 60);
    const start = daysAgo(i + 1, 23); // previous night
    const end = new Date(start.getTime() + dur * 60000);
    await prisma.sleepLog.create({
      data: { userId: uid, sleepStart: start, sleepEnd: end, durationMinutes: dur, qualityScore: 3 + Math.floor(Math.random() * 3), deepSleepMinutes: 80 + Math.floor(Math.random() * 40), remSleepMinutes: 90 + Math.floor(Math.random() * 30) },
    });
  }

  // Water Logs (today — 6 glasses)
  for (let g = 0; g < 6; g++) {
    await prisma.waterLog.create({ data: { userId: uid, amountMl: 250, loggedAt: daysAgo(0, 7 + g * 2) } });
  }
  console.log('✅ Health data seeded');

  // ── Meals ─────────────────────────────────────────────────────────────────
  const mealsToday = [
    { mealType: 'breakfast', foodItems: [{ name: 'Oatmeal', calories: 300 }, { name: 'Banana', calories: 90 }, { name: 'Coffee', calories: 30 }], totalCalories: 420, totalProtein: 14, totalCarbs: 78, totalFat: 8, hour: 8 },
    { mealType: 'lunch', foodItems: [{ name: 'Grilled Chicken', calories: 300 }, { name: 'Brown Rice', calories: 250 }, { name: 'Salad', calories: 100 }], totalCalories: 650, totalProtein: 45, totalCarbs: 72, totalFat: 12, hour: 13 },
    { mealType: 'snack', foodItems: [{ name: 'Greek Yogurt', calories: 120 }, { name: 'Almonds', calories: 60 }], totalCalories: 180, totalProtein: 16, totalCarbs: 12, totalFat: 8, hour: 16 },
  ];
  for (const m of mealsToday) {
    await prisma.mealLog.create({
      data: { userId: uid, mealType: m.mealType as any, foodItems: m.foodItems, totalCalories: m.totalCalories, totalProtein: m.totalProtein, totalCarbs: m.totalCarbs, totalFat: m.totalFat, loggedAt: daysAgo(0, m.hour) },
    });
  }
  console.log('✅ Meals seeded');

  // ── Habits ────────────────────────────────────────────────────────────────
  const habitsData = [
    { name: 'Drink 8 Glasses of Water', icon: 'droplets', color: '#74B9FF', targetCount: 8, category: 'health', streakCurrent: 12, streakBest: 21 },
    { name: 'Read 30 Minutes', icon: 'book-open', color: '#A29BFE', targetCount: 1, category: 'learning', streakCurrent: 7, streakBest: 14 },
    { name: 'Exercise', icon: 'dumbbell', color: '#FF9FF3', targetCount: 1, category: 'fitness', streakCurrent: 4, streakBest: 8 },
    { name: 'Meditate', icon: 'moon', color: '#55E6C1', targetCount: 1, category: 'mindfulness', streakCurrent: 9, streakBest: 15 },
    { name: 'No Junk Food', icon: 'flame', color: '#FDCB6E', targetCount: 1, category: 'health', streakCurrent: 2, streakBest: 5 },
  ];
  for (let hi = 0; hi < habitsData.length; hi++) {
    const h = habitsData[hi];
    const habit = await prisma.habit.create({
      data: { userId: uid, name: h.name, icon: h.icon, color: h.color, targetCount: h.targetCount, category: h.category as any, streakCurrent: h.streakCurrent, streakBest: h.streakBest, isActive: true },
    });
    // Complete first 4 habits today
    if (hi < 4) {
      await prisma.habitCompletion.create({ data: { userId: uid, habitId: habit.id, completedAt: daysAgo(0, 9), value: h.targetCount } });
    }
  }
  console.log('✅ Habits seeded');

  // ── Tasks & Projects ──────────────────────────────────────────────────────
  const projects = await Promise.all([
    prisma.project.create({ data: { userId: uid, name: 'Work', color: '#74B9FF', icon: '💼' } }),
    prisma.project.create({ data: { userId: uid, name: 'Personal', color: '#00B894', icon: '🏠' } }),
    prisma.project.create({ data: { userId: uid, name: 'Health', color: '#FF6B6B', icon: '❤️' } }),
    prisma.project.create({ data: { userId: uid, name: 'Learning', color: '#A29BFE', icon: '📚' } }),
  ]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tasksData = [
    { title: 'Review Q4 report', priority: 'urgent', status: 'todo', pi: 0, dueDate: today },
    { title: 'Prepare presentation slides', priority: 'urgent', status: 'in_progress', pi: 0, dueDate: today },
    { title: 'Morning workout', priority: 'high', status: 'done', pi: 2, dueDate: today },
    { title: 'Read Clean Code Ch.5', priority: 'medium', status: 'todo', pi: 3, dueDate: daysAgo(-1) },
    { title: 'Call dentist for appointment', priority: 'medium', status: 'todo', pi: 1, dueDate: daysAgo(-3) },
    { title: 'Update LinkedIn profile', priority: 'low', status: 'todo', pi: 1, dueDate: null },
    { title: 'AWS exam prep — module 3', priority: 'high', status: 'todo', pi: 3, dueDate: daysAgo(-2) },
  ];
  for (const t of tasksData) {
    await prisma.task.create({
      data: { userId: uid, projectId: projects[t.pi].id, title: t.title, priority: t.priority as any, status: t.status as any, dueDate: t.dueDate },
    });
  }
  console.log('✅ Tasks seeded');

  // ── Calendar Events ────────────────────────────────────────────────────────
  const eventsData = [
    { title: 'Team Standup', startHour: 9, durationMin: 30, color: '#74B9FF', offsetDays: 0 },
    { title: 'Lunch with Sarah', startHour: 12, durationMin: 60, color: '#FDCB6E', offsetDays: 0 },
    { title: 'Gym Session', startHour: 18, durationMin: 75, color: '#FF9FF3', offsetDays: 0 },
    { title: 'Doctor Appointment', startHour: 10, durationMin: 45, color: '#FF6B6B', offsetDays: 3 },
    { title: 'Project Deadline', startHour: 9, durationMin: 480, color: '#A29BFE', offsetDays: 6 },
    { title: 'Birthday Party', startHour: 19, durationMin: 180, color: '#FDCB6E', offsetDays: 6 },
  ];
  for (const ev of eventsData) {
    const start = daysAgo(-ev.offsetDays, ev.startHour);
    const end = new Date(start.getTime() + ev.durationMin * 60000);
    await prisma.calendarEvent.create({ data: { userId: uid, title: ev.title, startTime: start, endTime: end, color: ev.color } });
  }
  console.log('✅ Calendar events seeded');

  // ── Finance ────────────────────────────────────────────────────────────────
  const checking = await prisma.financialAccount.create({ data: { userId: uid, name: 'Checking Account', type: 'checking', balance: 4250.80, color: '#74B9FF' } });
  await prisma.financialAccount.create({ data: { userId: uid, name: 'Savings Account', type: 'savings', balance: 12400.00, color: '#00B894' } });
  await prisma.financialAccount.create({ data: { userId: uid, name: 'Investment Portfolio', type: 'investment', balance: 8750.50, color: '#A29BFE' } });

  const txData = [
    { description: 'Salary Deposit', category: 'salary', amount: 3200, type: 'income', offsetDays: 4 },
    { description: 'Grocery Store', category: 'food', amount: -67.40, type: 'expense', offsetDays: 5 },
    { description: 'Uber Ride', category: 'transport', amount: -12.50, type: 'expense', offsetDays: 5 },
    { description: 'Netflix', category: 'entertainment', amount: -15.99, type: 'expense', offsetDays: 6 },
    { description: 'Spotify Premium', category: 'entertainment', amount: -9.99, type: 'expense', offsetDays: 0 },
    { description: 'Coffee Shop', category: 'food', amount: -5.50, type: 'expense', offsetDays: 1 },
    { description: 'Electric Bill', category: 'utilities', amount: -89.00, type: 'expense', offsetDays: 2 },
    { description: 'Gym Membership', category: 'health', amount: -49.99, type: 'expense', offsetDays: 3 },
  ];
  const now = new Date();
  for (const tx of txData) {
    const d = new Date(today); d.setDate(d.getDate() - tx.offsetDays);
    await prisma.transaction.create({
      data: { userId: uid, accountId: checking.id, type: tx.type as any, amount: Math.abs(tx.amount), category: tx.category as any, description: tx.description, transactionDate: d },
    });
  }

  for (const b of [
    { category: 'food', amountLimit: 500 },
    { category: 'transport', amountLimit: 200 },
    { category: 'entertainment', amountLimit: 100 },
    { category: 'health', amountLimit: 150 },
    { category: 'utilities', amountLimit: 200 },
  ]) {
    await prisma.budget.create({ data: { userId: uid, category: b.category as any, amountLimit: b.amountLimit, period: 'monthly', month: now.getMonth() + 1, year: now.getFullYear() } });
  }

  for (const g of [
    { name: 'Emergency Fund', targetAmount: 10000, currentAmount: 6800, targetDate: new Date('2026-12-31') },
    { name: 'Summer Vacation', targetAmount: 3000, currentAmount: 1200, targetDate: new Date('2026-08-01') },
    { name: 'New Laptop', targetAmount: 2000, currentAmount: 800, targetDate: new Date('2026-06-01') },
  ]) {
    await prisma.savingsGoal.create({ data: { userId: uid, ...g } });
  }
  console.log('✅ Finance seeded');

  // ── Sports ─────────────────────────────────────────────────────────────────
  await prisma.sportsProfile.upsert({
    where: { userId: uid },
    update: {},
    create: { userId: uid, primarySports: ['running', 'cycling', 'gym'], skillLevels: { running: 'intermediate', cycling: 'intermediate', gym: 'advanced' } },
  });

  const sportsActivities = [
    { sportType: 'running', durationMinutes: 45, distanceKm: 8.2, caloriesBurned: 420, personalBest: true, offsetDays: 0 },
    { sportType: 'hiit', durationMinutes: 50, distanceKm: null, caloriesBurned: 380, personalBest: false, offsetDays: 1 },
    { sportType: 'cycling', durationMinutes: 75, distanceKm: 24.3, caloriesBurned: 540, personalBest: false, offsetDays: 2 },
    { sportType: 'gym', durationMinutes: 60, distanceKm: null, caloriesBurned: 340, personalBest: false, offsetDays: 4 },
    { sportType: 'running', durationMinutes: 35, distanceKm: 5.5, caloriesBurned: 280, personalBest: false, offsetDays: 5 },
  ];
  for (const a of sportsActivities) {
    await prisma.sportsActivity.create({
      data: { userId: uid, sportType: a.sportType, durationMinutes: a.durationMinutes, distanceKm: a.distanceKm, caloriesBurned: a.caloriesBurned, personalBest: a.personalBest, completedAt: daysAgo(a.offsetDays, 7) },
    });
  }

  await prisma.trainingPlan.create({
    data: {
      userId: uid, name: '10K Training Plan', sportType: 'running', goal: 'Complete a 10K race',
      weeksDuration: 12, status: 'active',
      startedAt: daysAgo(21),
      schedule: {
        week4: ['Easy 5K', 'Rest', 'Tempo 4K', 'Rest', 'Long Run 7K', 'Cross-train', 'Rest'],
      },
    },
  });
  console.log('✅ Sports seeded');

  // ── Wellness ───────────────────────────────────────────────────────────────
  const moodScores = [4, 3, 5, 4, 3, 4, 4];
  for (let i = 6; i >= 0; i--) {
    await prisma.moodLog.create({
      data: { userId: uid, moodScore: moodScores[6 - i], energyLevel: 3 + Math.floor(Math.random() * 3), stressLevel: 2 + Math.floor(Math.random() * 3), journalEntry: i === 0 ? 'Feeling productive today!' : null, loggedAt: daysAgo(i, 9) },
    });
  }

  for (const m of [
    { type: 'guided', durationMinutes: 10, moodBefore: 3, moodAfter: 5, offsetDays: 0 },
    { type: 'breathing', durationMinutes: 5, moodBefore: 4, moodAfter: 4, offsetDays: 1 },
    { type: 'body_scan', durationMinutes: 15, moodBefore: 2, moodAfter: 4, offsetDays: 2 },
  ]) {
    await prisma.meditationSession.create({ data: { userId: uid, type: m.type as any, durationMinutes: m.durationMinutes, moodBefore: m.moodBefore, moodAfter: m.moodAfter, completedAt: daysAgo(m.offsetDays, 7) } });
  }

  await prisma.journalEntry.create({
    data: { userId: uid, title: 'Morning Reflection', content: 'Had a great workout this morning. Feeling energized and ready to tackle the day. Goals: finish Q4 report, evening run.', moodScore: 4, tags: ['morning', 'workout', 'goals'], createdAt: daysAgo(0, 8) },
  });
  console.log('✅ Wellness seeded');

  // ── Education ──────────────────────────────────────────────────────────────
  const deckSpanish = await prisma.flashcardDeck.create({ data: { userId: uid, name: 'Spanish Verbs', category: 'language' } });
  const deckReact = await prisma.flashcardDeck.create({ data: { userId: uid, name: 'React Hooks', category: 'programming' } });
  const deckAws = await prisma.flashcardDeck.create({ data: { userId: uid, name: 'AWS Services', category: 'certification' } });

  const spanishCards = [
    { front: 'ser (to be)', back: 'soy, eres, es, somos, sois, son' },
    { front: 'tener (to have)', back: 'tengo, tienes, tiene, tenemos, tenéis, tienen' },
    { front: 'hacer (to do/make)', back: 'hago, haces, hace, hacemos, hacéis, hacen' },
  ];
  for (let ci = 0; ci < spanishCards.length; ci++) {
    await prisma.flashcard.create({ data: { deckId: deckSpanish.id, front: spanishCards[ci].front, back: spanishCards[ci].back, nextReviewAt: new Date() } });
  }
  await prisma.flashcardDeck.update({ where: { id: deckSpanish.id }, data: { cardCount: spanishCards.length } });

  const reactCards = [
    { front: 'useState', back: 'Returns stateful value and a function to update it' },
    { front: 'useEffect', back: 'Performs side effects in function components' },
    { front: 'useCallback', back: 'Returns memoized callback, re-creates when deps change' },
  ];
  for (let ci = 0; ci < reactCards.length; ci++) {
    await prisma.flashcard.create({ data: { deckId: deckReact.id, front: reactCards[ci].front, back: reactCards[ci].back, nextReviewAt: new Date() } });
  }
  await prisma.flashcardDeck.update({ where: { id: deckReact.id }, data: { cardCount: reactCards.length } });
  await prisma.flashcardDeck.update({ where: { id: deckAws.id }, data: { cardCount: 0 } });

  const goalSpanish = await prisma.learningGoal.create({ data: { userId: uid, title: 'Spanish B2', category: 'language', targetDate: new Date('2026-12-31'), dailyTimeGoalMinutes: 30, progressPercent: 65, status: 'active' } });
  const goalReact = await prisma.learningGoal.create({ data: { userId: uid, title: 'React Native Dev', category: 'programming', targetDate: new Date('2026-09-30'), dailyTimeGoalMinutes: 45, progressPercent: 48, status: 'active' } });
  const goalAws = await prisma.learningGoal.create({ data: { userId: uid, title: 'AWS Cloud Practitioner', category: 'certification', targetDate: new Date('2026-06-30'), dailyTimeGoalMinutes: 30, progressPercent: 80, status: 'active' } });

  await prisma.learningSession.create({ data: { userId: uid, goalId: goalSpanish.id, durationMinutes: 25, topic: 'Conversation Practice', satisfactionScore: 5, completedAt: daysAgo(0, 8) } });
  await prisma.learningSession.create({ data: { userId: uid, goalId: goalAws.id, durationMinutes: 20, topic: 'IAM & Security', satisfactionScore: 4, completedAt: daysAgo(0, 12) } });
  console.log('✅ Education seeded');

  // ── Notifications ──────────────────────────────────────────────────────────
  for (const n of [
    { title: 'Habit Reminder', body: 'Time to complete your Exercise habit!', type: 'habit_reminder' },
    { title: 'Task Due Today', body: 'Review Q4 report is due today', type: 'task_due' },
    { title: 'Daily Insight', body: 'Your sleep average improved by 12% this week 🎉', type: 'ai_insight' },
  ]) {
    await prisma.notification.create({ data: { userId: uid, title: n.title, body: n.body, type: n.type, isRead: false } });
  }
  console.log('✅ Notifications seeded');

  console.log('\n✨ Seed complete! User: demo@aura.app / Demo1234!');
}

main()
  .catch((e) => { console.error('❌ Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
