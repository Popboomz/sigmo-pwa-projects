# 问卷系统重构设计文档

## 一、表结构设计

### 1. progress 表（用户进度表）
每用户一行，记录用户的测试进度。

```typescript
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
```

**关键字段说明**：
- `lastSubmittedDay`: 当前唯一来源，计算公式：`currentDay = lastSubmittedDay + 1`
- `materialState`: **ended 状态不可逆**，一旦设置为 ended 永久无法改变
- `completedDays`: 累计完成的天数，用于计算完成率

---

### 2. questions_snapshot 表（问卷快照表）
每天首次生成后写入快照；同一天重复打开只读快照，不再调用模型。

```typescript
export const questionsSnapshot = pgTable("questions_snapshot", {
  id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(), // 用户 ID
  protocolId: varchar("protocol_id", { length: 36 }).notNull(), // 关联的协议 ID
  testDay: integer("test_day").notNull(), // 测试天数（1, 2, 3, ...）
  
  // 快照内容
  questions: jsonb().notNull(), // 问题列表
  generationContext: jsonb(), // 生成上下文（前一天评分、历史问题等）
  
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
```

**设计目的**：
- 避免同一天重复调用 LLM 生成问题
- 保证同一天内用户看到相同的问题
- 提升性能和节省成本

---

### 3. daily_logs 表（每日日志表）
存储用户每天的答题记录，(userId, testDay) 唯一，提交幂等。

```typescript
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
```

**设计目的**：
- 提交幂等：同一天重复提交会被拒绝
- 保证数据一致性：每天只有一条有效记录

---

## 二、工作流设计

### 工作流 1：GetTodayQuestions（获取今日问卷）

**流程图**：
```
开始
  ↓
1. 验证协议是否存在
  ↓
2. 获取或创建用户进度记录
  ↓
3. 检查物料状态是否为 ended
  ↓ 是 → 返回测试已结束
  ↓ 否
4. 计算 currentDay = lastSubmittedDay + 1
  ↓
5. 检查 currentDay 是否超过测试周期
  ↓ 是 → 更新 materialState = ended, 返回测试已结束
  ↓ 否
6. 查询 questions_snapshot 是否存在快照
  ↓ 存在 → 返回快照中的问题
  ↓ 不存在
7. 获取前一天答案（用于生成新问题）
  ↓
8. 调用 LLM 生成问题
  ↓
9. 写入 questions_snapshot 快照
  ↓
10. 返回问题列表
  ↓
结束
```

**关键伪代码**：

```typescript
async function getTodayQuestions(userId: string, protocolId: string) {
  // 1. 验证协议
  const protocol = await getProtocol(protocolId);
  if (!protocol) throw new Error('Protocol not found');
  
  // 2. 获取或创建进度
  let progress = await getProgress(userId, protocolId);
  if (!progress) {
    progress = await createProgress(userId, protocolId);
  }
  
  // 3. 检查是否已结束
  if (progress.materialState === 'ended') {
    return { state: 'ended', message: '测试已结束' };
  }
  
  // 4. 计算 currentDay
  const currentDay = progress.lastSubmittedDay + 1;
  const testPeriodDays = protocol.testPeriodDays || 21;
  
  // 5. 检查是否超过测试周期
  if (currentDay > testPeriodDays) {
    await updateProgress(userId, protocolId, {
      materialState: 'ended',
      lifecyclePhase: 'finished',
      lastSubmittedAt: new Date().toISOString(),
    });
    return { state: 'ended', message: '测试已结束' };
  }
  
  // 6. 查询快照
  const snapshot = await getQuestionsSnapshot(userId, currentDay);
  if (snapshot) {
    return { questions: snapshot.questions, testDay: currentDay };
  }
  
  // 7. 获取前一天答案
  const previousAnswers = currentDay > 1
    ? await getDailyLogs(userId, currentDay - 1)
    : [];
  
  // 8. 调用 LLM 生成问题
  const generatedQuestions = await generateQuestions({
    productName: protocol.productName,
    testDay: currentDay,
    testPeriodDays,
    materialState: progress.materialState,
    logicBranch: progress.logicBranch,
    previousAnswers,
  });
  
  // 9. 写入快照
  await createQuestionsSnapshot({
    userId,
    protocolId,
    testDay: currentDay,
    questions: generatedQuestions.questions,
    generationContext: {
      materialState: progress.materialState,
      logicBranch: progress.logicBranch,
      previousAnswers,
    },
  });
  
  // 10. 返回问题
  return {
    questions: generatedQuestions.questions,
    testDay: currentDay,
    isGenerated: true,
  };
}
```

**关键点**：
- ✅ `currentDay` 唯一来源于 `progress.lastSubmittedDay + 1`
- ✅ 快照机制避免重复调用 LLM
- ✅ 超过测试周期自动设置为 ended
- ✅ materialState 一旦 ended 永久 ended

---

### 工作流 2：SubmitDailyLog（提交每日日志）

**流程图**：
```
开始
  ↓
1. 验证协议是否存在
  ↓
2. 获取用户进度记录
  ↓ 不存在 → 创建进度记录
  ↓
3. 检查物料状态是否为 ended
  ↓ 是 → 返回测试已结束，拒绝提交
  ↓ 否
4. 计算 expectedDay = lastSubmittedDay + 1
  ↓
5. 检查 daily_logs 是否已存在（testDay = expectedDay）
  ↓ 存在 → 返回已提交，拒绝重复提交
  ↓ 不存在
6. 计算新状态（materialState, logicBranch, lifecyclePhase）
  ↓
7. 开始事务
  ↓
8. 插入 daily_logs 记录
  ↓ 失败 → 回滚事务，返回错误
  ↓ 成功
9. 更新 progress 记录
  ↓ 失败 → 回滚事务，返回错误
  ↓ 成功
10. 提交事务
  ↓
11. 返回提交成功
  ↓
结束
```

**关键伪代码**：

```typescript
async function submitDailyLog(
  userId: string,
  protocolId: string,
  answers: any[],
  remark?: string,
) {
  // 1. 验证协议
  const protocol = await getProtocol(protocolId);
  if (!protocol) throw new Error('Protocol not found');
  
  // 2. 获取进度
  let progress = await getProgress(userId, protocolId);
  if (!progress) {
    progress = await createProgress(userId, protocolId);
  }
  
  // 3. 检查是否已结束
  if (progress.materialState === 'ended') {
    throw new Error('测试已结束，无法继续提交');
  }
  
  // 4. 计算 expectedDay
  const expectedDay = progress.lastSubmittedDay + 1;
  
  // 5. 检查是否已提交（幂等）
  const existingLog = await getDailyLog(userId, expectedDay);
  if (existingLog) {
    throw new Error(`第 ${expectedDay} 天已提交，请勿重复提交`);
  }
  
  // 6. 计算结构化评分和新状态
  const structuredScores = calculateStructuredScores(answers);
  const newState = calculateNewState(
    structuredScores,
    expectedDay,
    protocol.testPeriodDays || 21,
    progress.materialState,
  );
  
  // 7. 开始事务
  await db.transaction(async (tx) => {
    try {
      // 8. 插入 daily_logs
      await tx.insert(dailyLogs).values({
        userId,
        protocolId,
        testDay: expectedDay,
        answers,
        remark,
        structuredScores,
        materialState: newState.materialState,
        logicBranch: newState.logicBranch,
        lifecyclePhase: newState.lifecyclePhase,
        submittedAt: new Date().toISOString(),
      });
      
      // 9. 更新 progress
      await tx.update(progress)
        .set({
          lastSubmittedDay: expectedDay,
          completedDays: progress.completedDays + 1,
          materialState: newState.materialState,
          logicBranch: newState.logicBranch,
          lifecyclePhase: newState.lifecyclePhase,
          lastSubmittedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(progress.userId, userId).and(eq(progress.protocolId, protocolId)));
      
      // 10. 提交事务
    } catch (error) {
      // 失败自动回滚
      throw error;
    }
  });
  
  // 11. 返回成功
  return {
    success: true,
    testDay: expectedDay,
    newState: newState,
  };
}
```

**关键点**：
- ✅ 幂等提交：检查 daily_logs 是否已存在
- ✅ 事务保证原子性：要么全部成功，要么全部失败
- ✅ 任何失败不推进 lastSubmittedDay
- ✅ materialState ended 状态拒绝提交
- ✅ lastSubmittedDay 和 testDay 始终一致

---

## 三、状态机设计

### materialState 状态机

```
new_bag → normal → nearing_end → ended
   ↓___________|_______________|
         （不可逆）
```

**转换规则**：
- `new_bag` → `normal`: 第 1 天提交后
- `normal` → `nearing_end`: 测试周期最后 3 天
- `nearing_end` → `ended`: 最后一天提交后
- `ended`: 永久结束，不可逆

### lifecyclePhase 生命周期

```
early → middle → late → finished
```

**转换规则**：
- `early`: 1-7 天
- `middle`: 8-14 天
- `late`: 15-20 天
- `finished`: 21 天或结束后

### logicBranch 逻辑分支

```
normal → endgame → retrospective
```

**转换规则**：
- `normal`: 正常测试阶段
- `endgame`: 接近结束，收集最终反馈
- `retrospective`: 测试结束后的回顾

---

## 四、关键约束总结

1. **currentDay 唯一来源**：`currentDay = progress.lastSubmittedDay + 1`，禁止按日期差计算
2. **快照幂等生成**：同一天只生成一次快照，后续只读
3. **提交幂等**：同一天只能提交一次，重复提交被拒绝
4. **事务原子性**：提交流程必须在事务中完成，任何失败不推进
5. **ended 不可逆**：materialState 一旦设置为 ended，永久无法改变

---

## 五、与现有系统的兼容性

### 保留旧表（用于历史数据）
- `protocols`: 保留
- `questionnaires`: 保留（标记为 legacy）
- `questionnaireAnswers`: 保留（标记为 legacy，用于迁移）
- `messages`: 保留
- `logs`: 保留
- `surveys`: 保留
- `users`: 保留

### 新增表
- `progress`: 用户进度表
- `questions_snapshot`: 问卷快照表
- `daily_logs`: 每日日志表

### 迁移策略
1. 保留旧数据用于查询
2. 新用户使用新系统
3. 提供 API 迁移旧数据到新系统（可选）
