import {
  pgTable, text, integer, boolean,
  timestamp, date, primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { AdapterAccountType } from 'next-auth/adapters';

// ── NextAuth required tables ──────────────────────────────────
export const users = pgTable('user', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  reminderTime: text('reminder_time').notNull().default('09:00'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const accounts = pgTable('account', {
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').$type<AdapterAccountType>().notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('providerAccountId').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (t) => ({ pk: primaryKey({ columns: [t.provider, t.providerAccountId] }) }));

export const sessions = pgTable('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable('verificationToken', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
}, (t) => ({ pk: primaryKey({ columns: [t.identifier, t.token] }) }));

// ── App tables ────────────────────────────────────────────────
export type ExerciseCategory = 'static_balance' | 'dynamic_balance' | 'strength_support';
export type UserRating = 'too_easy' | 'just_right' | 'too_hard';

export const exercises = pgTable('exercise', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  category: text('category').$type<ExerciseCategory>().notNull(),
  description: text('description').notNull(),
  instruction: text('instruction').notNull(),
  animationUrl: text('animation_url').notNull(),
  videoUrl: text('video_url'),
});

export const exerciseLevels = pgTable('exercise_level', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  exerciseId: text('exercise_id').notNull().references(() => exercises.id),
  level: integer('level').notNull(),
  durationSeconds: integer('duration_seconds'),
  reps: integer('reps'),
  difficultyNotes: text('difficulty_notes').notNull(),
});

export const userExercisePlan = pgTable('user_exercise_plan', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  exerciseId: text('exercise_id').notNull().references(() => exercises.id),
  level: integer('level').notNull(),
  scheduledDate: date('scheduled_date').notNull(),
  order: integer('order').notNull(),
});

export const sessionLogs = pgTable('session_log', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  completedAt: timestamp('completed_at'),
  checkInOverall: integer('check_in_overall'),
  checkInNotes: text('check_in_notes'),
});

export const exerciseLogs = pgTable('exercise_log', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: text('session_id').notNull().references(() => sessionLogs.id, { onDelete: 'cascade' }),
  exerciseId: text('exercise_id').notNull().references(() => exercises.id),
  level: integer('level').notNull(),
  completed: boolean('completed').notNull().default(false),
  durationSeconds: integer('duration_seconds'),
  userRating: text('user_rating').$type<UserRating>(),
});

export const pushSubscriptions = pgTable('push_subscription', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userExercisePlanRelations = relations(userExercisePlan, ({ one }) => ({
  exercise: one(exercises, { fields: [userExercisePlan.exerciseId], references: [exercises.id] }),
}));

export const sessionLogRelations = relations(sessionLogs, ({ many }) => ({
  exerciseLogs: many(exerciseLogs),
}));

export const exerciseLogRelations = relations(exerciseLogs, ({ one }) => ({
  session: one(sessionLogs, { fields: [exerciseLogs.sessionId], references: [sessionLogs.id] }),
}));

export const pushSubscriptionRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, { fields: [pushSubscriptions.userId], references: [users.id] }),
}));
