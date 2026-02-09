-- 为 questions_snapshot 表添加 validation 和 source 字段
ALTER TABLE questions_snapshot ADD COLUMN IF NOT EXISTS validation JSONB;
ALTER TABLE questions_snapshot ADD COLUMN IF NOT EXISTS source VARCHAR(20);
