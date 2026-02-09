import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

interface GenerateQuestionsRequest {
  dayIndex: number;
  testDurationDays: number;
  productName?: string;
  prevDayAnswers?: {
    q1Score?: number;
    q2Score?: number;
    q3Score?: number;
    q4Score?: number;
    q5Score?: number;
  };
  history?: Array<{
    dayIndex: number;
    questions: Array<{
      id: string;
      theme: string;
      title: string;
    }>;
  }>;
}

interface Question {
  id: string;
  theme: string;
  title: string;
  options: string[];
  followupRule: string;
}

interface GenerateQuestionsResponse {
  dayIndex: number;
  questions: Question[];
  avoidRepeatCheck: string;
}

const THEME_POOL = [
  'odor_control',
  'dust_level',
  'clumping',
  'tracking',
  'cleanup',
  'urine_absorb',
  'appearance',
  'comfort',
];

const OPTIONS = ['很差', '差', '可以接受', '好', '很好'];

export async function POST(request: NextRequest) {
  try {
    const body: GenerateQuestionsRequest = await request.json();
    const { dayIndex, testDurationDays, productName, prevDayAnswers, history } = body;

    // 构建历史问题文本（用于去重）
    let historyText = '';
    if (history && history.length > 0) {
      const recentHistory = history.slice(-2); // 只取最近2天
      historyText = recentHistory
        .map(
          (h) =>
            `Day ${h.dayIndex}:\n` + h.questions.map((q) => `- ${q.title} (${q.theme})`).join('\n')
        )
        .join('\n\n');
    }

    // 构建前一天评分文本
    let prevDayScoresText = '';
    if (prevDayAnswers && dayIndex > 1) {
      const scores = Object.entries(prevDayAnswers)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      if (scores) {
        prevDayScoresText = `前一天评分: ${scores}`;
      }
    }

    // 构建系统提示词
    const systemPrompt = `你是长期产品测试问卷生成引擎。你的任务是根据测试进度和用户历史回答，动态生成当天的5个单选问题。

【输入信息】
- 当前天数: Day ${dayIndex}
- 测试总天数: ${testDurationDays}天
- 产品名称: ${productName || '猫砂'}
- 前一天评分: ${prevDayScoresText || '无（第一天）'}
- 最近2天历史问题:
${historyText || '无（第一天）'}

【输出要求】
1. 仅输出纯JSON格式，不要有任何解释、注释或Markdown标记
2. 必须完全符合以下结构：
{
  "dayIndex": ${dayIndex},
  "questions": [
    {
      "id": "D${dayIndex}Q1",
      "theme": "主题代码",
      "title": "问题标题（单句中文，12-28字）",
      "options": ["很差","差","可以接受","好","很好"],
      "followupRule": "基于评分的生成规则说明"
    }
  ],
  "avoidRepeatCheck": "避免重复的说明"
}

【强制规则】
1. 每天必须生成恰好5个问题
2. 每个问题必须是单句中文，长度严格在12-28字之间
3. 所有问题必须使用完全相同的选项：["很差","差","可以接受","好","很好"]，不允许任何修改
4. 禁止开放题、禁止多选、禁止解释性文字
5. 问题ID格式：D${dayIndex}Q1, D${dayIndex}Q2, D${dayIndex}Q3, D${dayIndex}Q4, D${dayIndex}Q5

【主题池】（必须从中选择）
${THEME_POOL.map((t) => `- ${t}`).join('\n')}

【主题约束】
- 每天最多2个问题使用同一主题
- 不允许5个问题使用同一主题
- 尽量覆盖不同主题

【生成逻辑】
Day 1（基线）：
- 生成5个基础体验问题，覆盖不同核心维度
- 不追问原因，只问感受

Day 2–Day ${testDurationDays}（递进）：
根据前一天评分生成问题：
- 评分≤2（很差/差）：
  → 生成更具体、可定位的问题（原因、场景、问题点）
  → 例："除臭效果在什么情况下最差？"
- 评分=3（可以接受）：
  → 生成稳定性、波动性、边界条件相关问题
  → 例:"结团效果是否稳定？"
- 评分≥4（好/很好）：
  → 生成持续表现、对比变化、是否保持的问题
  → 例："除臭效果能否保持全天？"

【去重与质量约束】
1. 不得与history中最近2天的问题高度相似（包括同义改写）
2. 不得出现医疗、疾病、药物、隐私、人身评价相关内容
3. 问题必须可直接用于UI渲染，不包含序号、不换行
4. 避免使用"如何"、"为什么"等开放性提问方式
5. 问题必须客观可评，避免主观感受词（如"你觉得"）

【重要】
- 输出必须是有效的JSON格式
- 不要输出任何JSON之外的内容
- 确保所有字段都存在且格式正确`;

    // 构建用户消息
    let userPrompt = `请生成第${dayIndex}天的5个测试问题。`;

    if (dayIndex === 1) {
      userPrompt += '\n\n这是第一天，请生成5个基础体验问题，覆盖不同核心维度。';
    } else {
      userPrompt += `\n\n这是第${dayIndex}天，请根据以下信息生成递进式问题：`;
      if (prevDayScoresText) {
        userPrompt += `\n\n${prevDayScoresText}`;
      }
      userPrompt += '\n\n问题生成原则：';
      userPrompt += '\n- 评分低（≤2）：生成更具体、可定位的问题';
      userPrompt += '\n- 评分中等（=3）：生成稳定性、波动性问题';
      userPrompt += '\n- 评分高（≥4）：生成持续表现、保持性问题';
    }

    // 调用豆包大模型
    const config = new Config();
    const client = new LLMClient(config);

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    const response = await client.invoke(messages, {
      model: 'doubao-seed-1-8-251228',
      temperature: 0.7,
    });

    // 解析响应
    let jsonResponse: GenerateQuestionsResponse;
    try {
      // 清理可能的Markdown代码块标记
      let cleanedContent = response.content.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.slice(7);
      }
      if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.slice(3);
      }
      if (cleanedContent.endsWith('```')) {
        cleanedContent = cleanedContent.slice(0, -3);
      }
      cleanedContent = cleanedContent.trim();

      jsonResponse = JSON.parse(cleanedContent);
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      console.error('Raw response:', response.content);
      return NextResponse.json(
        { error: 'Failed to generate questions, invalid response format' },
        { status: 500 }
      );
    }

    // 验证响应格式
    if (!jsonResponse.questions || !Array.isArray(jsonResponse.questions)) {
      return NextResponse.json(
        { error: 'Invalid response: questions not found or not array' },
        { status: 500 }
      );
    }

    if (jsonResponse.questions.length !== 5) {
      return NextResponse.json(
        { error: `Invalid response: expected 5 questions, got ${jsonResponse.questions.length}` },
        { status: 500 }
      );
    }

    // 验证每个问题的格式
    for (const q of jsonResponse.questions) {
      if (!q.id || !q.theme || !q.title || !q.options || !Array.isArray(q.options)) {
        return NextResponse.json(
          { error: 'Invalid question format: missing required fields' },
          { status: 500 }
        );
      }

      // 验证选项
      if (JSON.stringify(q.options) !== JSON.stringify(OPTIONS)) {
        return NextResponse.json(
          { error: 'Invalid options: must be ["很差","差","可以接受","好","很好"]' },
          { status: 500 }
        );
      }

      // 验证问题长度
      if (q.title.length < 12 || q.title.length > 28) {
        return NextResponse.json(
          { error: `Invalid question title length: "${q.title}" (${q.title.length} chars, expected 12-28)` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: jsonResponse,
    });
  } catch (error) {
    console.error('Generate questions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
