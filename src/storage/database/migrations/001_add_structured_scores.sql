-- 为 protocols 表添加 materialState 字段
ALTER TABLE protocols ADD COLUMN IF NOT EXISTS material_state VARCHAR(20) DEFAULT 'new_bag';

-- 更新 testPeriodDays 默认值为 21
ALTER TABLE protocols ALTER COLUMN test_period_days SET DEFAULT 21;

-- 为 questionnaire_answers 表添加新字段
ALTER TABLE questionnaire_answers ADD COLUMN IF NOT EXISTS structured_scores JSONB;
ALTER TABLE questionnaire_answers ADD COLUMN IF NOT EXISTS material_state VARCHAR(20);
ALTER TABLE questionnaire_answers ADD COLUMN IF NOT EXISTS lifecycle_phase VARCHAR(20);
ALTER TABLE questionnaire_answers ADD COLUMN IF NOT EXISTS logic_branch VARCHAR(20);
ALTER TABLE questionnaire_answers ADD COLUMN IF NOT EXISTS is_legacy BOOLEAN DEFAULT FALSE;

-- 为 legacy 数据创建索引（可选）
CREATE INDEX IF NOT EXISTS questionnaire_answers_is_legacy_idx ON questionnaire_answers(is_legacy);
CREATE INDEX IF NOT EXISTS questionnaire_answers_material_state_idx ON questionnaire_answers(material_state);
