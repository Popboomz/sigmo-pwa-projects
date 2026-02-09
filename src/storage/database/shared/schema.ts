import { pgTable, varchar, jsonb, timestamp, index, unique, text, boolean, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod"



export const logs = pgTable("logs", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	protocolId: varchar("protocol_id", { length: 36 }).notNull(),
	content: jsonb().notNull(),
	submittedAt: timestamp("submitted_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const surveys = pgTable("surveys", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	userId: varchar("user_id", { length: 36 }),
	content: jsonb().notNull(),
	submittedAt: timestamp("submitted_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const users = pgTable("users", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	password: text(),
	name: varchar({ length: 128 }),
	isAdmin: boolean("is_admin").default(false).notNull(),
	provider: varchar({ length: 50 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("users_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	unique("users_email_unique").on(table.email),
]);

export const questionnaires = pgTable("questionnaires", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	protocolId: varchar("protocol_id", { length: 36 }).notNull(),
	dayIndex: integer("day_index").notNull(),
	testDurationDays: integer("test_duration_days").notNull(),
	productName: text("product_name"),
	questions: jsonb().notNull(),
	generatedAt: timestamp("generated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("questionnaires_protocol_day_idx").using("btree", table.protocolId.asc().nullsLast().op("int4_ops"), table.dayIndex.asc().nullsLast().op("int4_ops")),
]);

export const messages = pgTable("messages", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	authorName: varchar("author_name", { length: 128 }).notNull(),
	content: text().notNull(),
	createdBy: varchar("created_by", { length: 36 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("messages_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
]);

export const protocols = pgTable("protocols", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	shareLink: varchar("share_link", { length: 255 }).notNull(),
	createdBy: varchar("created_by", { length: 36 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	productName: varchar("product_name", { length: 255 }),
	testPeriodDays: integer("test_period_days").default(21).notNull(),
	materialState: varchar("material_state", { length: 20 }).default('new_bag'),
}, (table) => [
	index("protocols_share_link_idx").using("btree", table.shareLink.asc().nullsLast().op("text_ops")),
	unique("protocols_share_link_unique").on(table.shareLink),
]);

export const questionnaireAnswers = pgTable("questionnaire_answers", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	questionnaireId: varchar("questionnaire_id", { length: 36 }).notNull(),
	protocolId: varchar("protocol_id", { length: 36 }).notNull(),
	dayIndex: integer("day_index").notNull(),
	answers: jsonb().notNull(),
	submittedAt: timestamp("submitted_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	remark: text(),
	structuredScores: jsonb("structured_scores"),
	materialState: varchar("material_state", { length: 20 }),
	lifecyclePhase: varchar("lifecycle_phase", { length: 20 }),
	logicBranch: varchar("logic_branch", { length: 20 }),
	isLegacy: boolean("is_legacy").default(false),
}, (table) => [
	index("questionnaire_answers_protocol_day_idx").using("btree", table.protocolId.asc().nullsLast().op("int4_ops"), table.dayIndex.asc().nullsLast().op("int4_ops")),
	index("questionnaire_answers_questionnaire_idx").using("btree", table.questionnaireId.asc().nullsLast().op("text_ops")),
]);

// Zod schemas for validation
const { createInsertSchema: createCoercedInsertSchema } = createSchemaFactory({
  coerce: { date: true },
});

// Logs schemas
export const insertLogSchema = createCoercedInsertSchema(logs).pick({
  protocolId: true,
  content: true,
});

// Messages schemas
export const insertMessageSchema = createCoercedInsertSchema(messages).pick({
  authorName: true,
  content: true,
  createdBy: true,
});

// Questionnaires schemas
export const insertQuestionnaireSchema = createCoercedInsertSchema(questionnaires).pick({
  protocolId: true,
  dayIndex: true,
  testDurationDays: true,
  productName: true,
  questions: true,
});

// QuestionnaireAnswers schemas
export const insertQuestionnaireAnswerSchema = createCoercedInsertSchema(questionnaireAnswers).pick({
  questionnaireId: true,
  protocolId: true,
  dayIndex: true,
  answers: true,
  structuredScores: true,
  materialState: true,
  lifecyclePhase: true,
  logicBranch: true,
  remark: true,
  isLegacy: true,
});

// Protocols schemas
export const insertProtocolSchema = createCoercedInsertSchema(protocols).pick({
  title: true,
  description: true,
  shareLink: true,
  productName: true,
  testPeriodDays: true,
  createdBy: true,
  materialState: true,
});

export const updateProtocolSchema = createCoercedInsertSchema(protocols)
  .pick({
    title: true,
    description: true,
    productName: true,
    testPeriodDays: true,
    materialState: true,
  })
  .partial();

// Users schemas
export const insertUserSchema = createCoercedInsertSchema(users).pick({
  email: true,
  password: true,
  name: true,
  isAdmin: true,
  provider: true,
});

export const updateUserSchema = createCoercedInsertSchema(users)
  .pick({
    email: true,
    name: true,
    password: true,
    isAdmin: true,
  })
  .partial();

// Surveys schemas
export const insertSurveySchema = createCoercedInsertSchema(surveys).pick({
  userId: true,
  content: true,
});

// 5 维度评分 Schema
export const structuredScoresSchema = z.object({
  odor: z.number().int().min(1).max(5),
  dust: z.number().int().min(1).max(5),
  clumping: z.number().int().min(1).max(5),
  comfort: z.number().int().min(1).max(5),
  cleanup: z.number().int().min(1).max(5),
});

// Material State Schema
export const materialStateSchema = z.enum(['new_bag', 'normal', 'nearing_end', 'ended']);

// Lifecycle Phase Schema
export const lifecyclePhaseSchema = z.enum(['early', 'mid', 'late', 'depleted', 'full_cycle']);

// Logic Branch Schema
export const logicBranchSchema = z.enum(['normal', 'endgame', 'retrospective']);

// TypeScript types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;

export type Survey = typeof surveys.$inferSelect;
export type InsertSurvey = z.infer<typeof insertSurveySchema>;

export type Protocol = typeof protocols.$inferSelect;
export type InsertProtocol = z.infer<typeof insertProtocolSchema>;
export type UpdateProtocol = z.infer<typeof updateProtocolSchema>;

export type Log = typeof logs.$inferSelect;
export type InsertLog = z.infer<typeof insertLogSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Questionnaire = typeof questionnaires.$inferSelect;
export type InsertQuestionnaire = z.infer<typeof insertQuestionnaireSchema>;

export type QuestionnaireAnswer = typeof questionnaireAnswers.$inferSelect;
export type InsertQuestionnaireAnswer = z.infer<typeof insertQuestionnaireAnswerSchema>;

// ==================== New Questionnaire System Tables ====================

// Progress table (用户进度表)
export const progress = pgTable("progress", {
  id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(), // 用户 ID（可以是匿名用户）
  protocolId: varchar("protocol_id", { length: 36 }).notNull(), // 关联的协议 ID

  // 进度相关
  lastSubmittedDay: integer("last_submitted_day").default(0).notNull(), // 最后提交的天数（0 表示未开始）
  completedDays: integer("completed_days").default(0).notNull(), // 已完成天数（累计）

  // 状态相关
  materialState: varchar("material_state", { length: 20 }).default('new_bag').notNull(), // new_bag | normal | nearing_end | ended
  logicBranch: varchar("logic_branch", { length: 20 }), // normal | endgame | retrospective
  lifecyclePhase: varchar("lifecycle_phase", { length: 20 }), // early | middle | late | finished

  // 时间相关
  lastSubmittedAt: timestamp("last_submitted_at", { withTimezone: true, mode: 'string' }), // 最后提交时间
  startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }), // 开始测试时间
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
  // 每个用户对每个协议只能有一条进度记录
  unique("progress_user_protocol_unique").on(table.userId, table.protocolId),
  index("progress_user_idx").using("btree", table.userId.asc().nullsLast()),
  index("progress_protocol_idx").using("btree", table.protocolId.asc().nullsLast()),
]);

// Questions snapshot table (问卷快照表)
export const questionsSnapshot = pgTable("questions_snapshot", {
  id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(), // 用户 ID
  protocolId: varchar("protocol_id", { length: 36 }).notNull(), // 关联的协议 ID
  testDay: integer("test_day").notNull(), // 测试天数（1, 2, 3, ...）

  // 快照内容
  questions: jsonb().notNull(), // 问题列表
  generationContext: jsonb(), // 生成上下文（前一天评分、历史问题等）
  validation: jsonb("validation"), // 验证结果（valid, errors, warnings, score）
  source: varchar("source", { length: 20 }), // 问题来源：model | fallback

  // 时间相关
  generatedAt: timestamp("generated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  // 同一天同一用户只能有一条快照（幂等生成）
  unique("questions_snapshot_user_day_unique").on(table.userId, table.testDay),
  index("questions_snapshot_user_idx").using("btree", table.userId.asc().nullsLast()),
  index("questions_snapshot_protocol_idx").using("btree", table.protocolId.asc().nullsLast()),
  index("questions_snapshot_day_idx").using("btree", table.testDay.asc().nullsLast()),
]);

// Daily logs table (每日日志表)
export const dailyLogs = pgTable("daily_logs", {
  id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(), // 用户 ID
  protocolId: varchar("protocol_id", { length: 36 }).notNull(), // 关联的协议 ID
  testDay: integer("test_day").notNull(), // 测试天数（1, 2, 3, ...）

  // 答案内容
  answers: jsonb().notNull(), // 答案列表 [{ questionId, score, question }]
  remark: text(), // 用户备注
  structuredScores: jsonb("structured_scores"), // 5 维度评分 { odor, dust, clumping, comfort, cleanup }

  // 状态相关
  materialState: varchar("material_state", { length: 20 }).default('new_bag').notNull(), // 提交时的物料状态
  logicBranch: varchar("logic_branch", { length: 20 }), // 提交时的逻辑分支
  lifecyclePhase: varchar("lifecycle_phase", { length: 20 }), // 提交时的生命周期阶段

  // 时间相关
  submittedAt: timestamp("submitted_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  // 同一天同一用户只能有一条记录（幂等提交）
  unique("daily_logs_user_day_unique").on(table.userId, table.testDay),
  index("daily_logs_user_idx").using("btree", table.userId.asc().nullsLast()),
  index("daily_logs_protocol_idx").using("btree", table.protocolId.asc().nullsLast()),
  index("daily_logs_day_idx").using("btree", table.testDay.asc().nullsLast()),
  index("daily_logs_submitted_idx").using("btree", table.submittedAt.asc().nullsLast()),
]);

// ==================== Schemas for New Tables ====================

export const insertProgressSchema = createCoercedInsertSchema(progress).pick({
  userId: true,
  protocolId: true,
  lastSubmittedDay: true,
  completedDays: true,
  materialState: true,
  logicBranch: true,
  lifecyclePhase: true,
  lastSubmittedAt: true,
  startedAt: true,
});

export const updateProgressSchema = createCoercedInsertSchema(progress)
  .pick({
    lastSubmittedDay: true,
    completedDays: true,
    materialState: true,
    logicBranch: true,
    lifecyclePhase: true,
    lastSubmittedAt: true,
    startedAt: true,
  })
  .partial();

export const insertQuestionsSnapshotSchema = createCoercedInsertSchema(questionsSnapshot).pick({
  userId: true,
  protocolId: true,
  testDay: true,
  questions: true,
  generationContext: true,
  generatedAt: true,
});

export const insertDailyLogsSchema = createCoercedInsertSchema(dailyLogs).pick({
  userId: true,
  protocolId: true,
  testDay: true,
  answers: true,
  remark: true,
  structuredScores: true,
  materialState: true,
  logicBranch: true,
  lifecyclePhase: true,
  submittedAt: true,
});

// ==================== TypeScript Types for New Tables ====================

export type Progress = typeof progress.$inferSelect;
export type InsertProgress = z.infer<typeof insertProgressSchema>;
export type UpdateProgress = z.infer<typeof updateProgressSchema>;

export type QuestionsSnapshot = typeof questionsSnapshot.$inferSelect;
export type InsertQuestionsSnapshot = z.infer<typeof insertQuestionsSnapshotSchema>;

export type DailyLogs = typeof dailyLogs.$inferSelect;
export type InsertDailyLogs = z.infer<typeof insertDailyLogsSchema>;
