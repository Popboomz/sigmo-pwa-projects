# 前端更新计划

## 更新目标

将前端问卷页面从旧系统（questionnaire/answers）迁移到新系统（基于快照和进度）。

## 更新内容

### 1. 协议着陆页 (`src/app/protocol/[shareLink]/page.tsx`)

**当前问题**：
- 使用旧的 `questionnaire/list` 和 `questionnaire/answers` 接口
- 提前需要生成所有问卷

**更新方案**：
- 移除 `questionnaire/list` 调用
- 移除 `questionnaire/answers` 调用
- 直接调用 `/api/public/questionnaire/today` 获取今日问卷
- 基于返回的进度信息（completedDays, testPeriodDays）显示进度

**新的数据流**：
```
1. 页面加载 → 获取协议信息
2. 点击"开始测试" → 调用 /api/public/questionnaire/today
3. 根据返回的 state 判断：
   - state === 'ended' → 跳转到完成页面
   - state === 'normal' → 跳转到问卷填写页面 /day/{testDay}
```

### 2. 问卷填写页面 (`src/app/protocol/[shareLink]/day/[day]/page.tsx`)

**当前问题**：
- 使用旧的 `questionnaire/dynamic` 接口
- 使用旧的 `questionnaire/submit` 接口

**更新方案**：
- 移除 `questionnaire/dynamic` 调用（不再需要）
- 使用 `today` 接口返回的 questions
- 更新提交接口到 `/api/public/questionnaire/daily-log`

**新的数据流**：
```
1. 页面加载 → 调用 /api/public/questionnaire/today
2. 根据返回的 testDay 和 questions 显示问卷
3. 用户填写后 → 调用 /api/public/questionnaire/daily-log 提交
4. 提交成功 → 跳转回协议着陆页
```

## API 调用映射

| 旧接口 | 新接口 | 说明 |
|--------|--------|------|
| `/api/public/questionnaire/list` | 无需调用 | 新系统动态生成 |
| `/api/public/questionnaire/dynamic` | `/api/public/questionnaire/today` | 获取今日问卷（含快照） |
| `/api/public/questionnaire/submit` | `/api/public/questionnaire/daily-log` | 提交每日日志 |
| `/api/public/questionnaire/answers` | 无需调用 | 使用 progress.completedDays |

## 关键差异

### 1. 进度计算
- **旧系统**：通过 questionnaire/answers 的数量计算
- **新系统**：通过 progress.lastSubmittedDay 计算

### 2. 问卷生成
- **旧系统**：一次性生成所有问卷，或按需生成
- **新系统**：动态生成，每天首次打开时生成，后续读快照

### 3. 提交流程
- **旧系统**：直接提交到 questionnaire_answers
- **新系统**：提交到 daily_logs，同时更新 progress

## 实施步骤

1. 更新 `src/app/protocol/[shareLink]/page.tsx`
2. 更新 `src/app/protocol/[shareLink]/day/[day]/page.tsx`
3. 测试完整流程

## 注意事项

- 新接口返回的 `testDay` 始终等于 `lastSubmittedDay + 1`
- 提交时需要传递 `userId`（可以是匿名用户，使用默认值 'anonymous'）
- 提交时需要传递 `testDay`，后端会验证是否等于 `expectedDay`
