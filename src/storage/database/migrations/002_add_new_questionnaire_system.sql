-- ==================== Progress Table (用户进度表) ====================
CREATE TABLE IF NOT EXISTS progress (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) NOT NULL,
  protocol_id VARCHAR(36) NOT NULL,

  -- 进度相关
  last_submitted_day INTEGER DEFAULT 0 NOT NULL,
  completed_days INTEGER DEFAULT 0 NOT NULL,

  -- 状态相关
  material_state VARCHAR(20) DEFAULT 'new_bag' NOT NULL,
  logic_branch VARCHAR(20),
  lifecycle_phase VARCHAR(20),

  -- 时间相关
  last_submitted_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- 创建唯一约束
CREATE UNIQUE INDEX IF NOT EXISTS progress_user_protocol_unique
ON progress (user_id, protocol_id);

-- 创建索引
CREATE INDEX IF NOT EXISTS progress_user_idx
ON progress (user_id);

CREATE INDEX IF NOT EXISTS progress_protocol_idx
ON progress (protocol_id);

-- ==================== Questions Snapshot Table (问卷快照表) ====================
CREATE TABLE IF NOT EXISTS questions_snapshot (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) NOT NULL,
  protocol_id VARCHAR(36) NOT NULL,
  test_day INTEGER NOT NULL,

  -- 快照内容
  questions JSONB NOT NULL,
  generation_context JSONB,

  -- 时间相关
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 创建唯一约束
CREATE UNIQUE INDEX IF NOT EXISTS questions_snapshot_user_day_unique
ON questions_snapshot (user_id, test_day);

-- 创建索引
CREATE INDEX IF NOT EXISTS questions_snapshot_user_idx
ON questions_snapshot (user_id);

CREATE INDEX IF NOT EXISTS questions_snapshot_protocol_idx
ON questions_snapshot (protocol_id);

CREATE INDEX IF NOT EXISTS questions_snapshot_day_idx
ON questions_snapshot (test_day);

-- ==================== Daily Logs Table (每日日志表) ====================
CREATE TABLE IF NOT EXISTS daily_logs (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) NOT NULL,
  protocol_id VARCHAR(36) NOT NULL,
  test_day INTEGER NOT NULL,

  -- 答案内容
  answers JSONB NOT NULL,
  remark TEXT,
  structured_scores JSONB,

  -- 状态相关
  material_state VARCHAR(20) DEFAULT 'new_bag' NOT NULL,
  logic_branch VARCHAR(20),
  lifecycle_phase VARCHAR(20),

  -- 时间相关
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 创建唯一约束
CREATE UNIQUE INDEX IF NOT EXISTS daily_logs_user_day_unique
ON daily_logs (user_id, test_day);

-- 创建索引
CREATE INDEX IF NOT EXISTS daily_logs_user_idx
ON daily_logs (user_id);

CREATE INDEX IF NOT EXISTS daily_logs_protocol_idx
ON daily_logs (protocol_id);

CREATE INDEX IF NOT EXISTS daily_logs_day_idx
ON daily_logs (test_day);

CREATE INDEX IF NOT EXISTS daily_logs_submitted_idx
ON daily_logs (submitted_at);
