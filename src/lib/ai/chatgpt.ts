type ChatRole = 'system' | 'user' | 'assistant';

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface GenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface GenerateJsonOptions extends GenerateOptions {
  systemPrompt: string;
  userPrompt: string;
}

interface GenerateTextOptions extends GenerateOptions {
  systemPrompt: string;
  userPrompt: string;
}

function getProvider() {
  return (process.env.AI_PROVIDER || 'openai').toLowerCase();
}

function getApiKey() {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error('AI_API_KEY is required');
  }
  return apiKey;
}

function getEndpoint() {
  const configured = (process.env.AI_API_BASE || '').trim();
  const fallback = 'https://api.openai.com/v1/chat/completions';

  if (!configured) {
    return fallback;
  }

  const normalized = configured.endsWith('/') ? configured.slice(0, -1) : configured;
  if (normalized.endsWith('/chat/completions')) {
    return normalized;
  }

  return `${normalized}/chat/completions`;
}

function getModel(model?: string) {
  if (model) {
    return model;
  }

  const configuredModel = (process.env.AI_MODEL || '').trim();
  if (configuredModel) {
    return configuredModel;
  }

  const endpoint = getEndpoint();
  if (endpoint.includes('generativelanguage.googleapis.com')) {
    return 'gemini-2.5-flash';
  }

  return 'gpt-4o-mini';
}

function isGeminiEndpoint() {
  return getEndpoint().includes('generativelanguage.googleapis.com');
}

function getGeminiRestBase() {
  const configured = (process.env.AI_API_BASE || '').trim();
  if (!configured) {
    return 'https://generativelanguage.googleapis.com/v1beta';
  }

  try {
    const url = new URL(configured);
    return `${url.origin}/v1beta`;
  } catch {
    return 'https://generativelanguage.googleapis.com/v1beta';
  }
}

function extractContent(payload: any): string {
  const content = payload?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('AI response missing message.content');
  }
  return content.trim();
}

function shouldUseResponseFormat(expectJson: boolean): boolean {
  if (!expectJson) {
    return false;
  }

  const endpoint = getEndpoint();

  // Gemini's OpenAI-compatible endpoint is documented for chat completions,
  // but structured output compatibility is still uneven, so we rely on prompt
  // discipline plus local JSON cleanup there.
  if (endpoint.includes('generativelanguage.googleapis.com')) {
    return false;
  }

  return true;
}

function cleanJsonText(text: string): string {
  const withoutFence = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const start = withoutFence.indexOf('{');
  const end = withoutFence.lastIndexOf('}');

  if (start === -1 || end === -1 || end < start) {
    throw new Error('AI response does not contain a JSON object');
  }

  return withoutFence.slice(start, end + 1);
}

async function invokeChatCompletion(
  messages: ChatMessage[],
  options: GenerateOptions,
  expectJson: boolean,
): Promise<string> {
  const provider = getProvider();
  if (provider !== 'openai') {
    throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(getEndpoint(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: getModel(options.model),
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens,
        messages,
        ...(shouldUseResponseFormat(expectJson)
          ? { response_format: { type: 'json_object' } }
          : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI error ${response.status}: ${errorText.slice(0, 240)}`);
    }

    const payload = await response.json();
    return extractContent(payload);
  } finally {
    clearTimeout(timeout);
  }
}

async function invokeGeminiGenerateContent(
  systemPrompt: string,
  userPrompt: string,
  options: GenerateOptions,
  expectJson: boolean,
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(
      `${getGeminiRestBase()}/models/${encodeURIComponent(getModel(options.model))}:generateContent?key=${encodeURIComponent(getApiKey())}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            temperature: options.temperature ?? 0.2,
            max_output_tokens: options.maxTokens,
            thinkingConfig: {
              thinkingBudget: 0,
            },
            ...(expectJson
              ? {
                  response_mime_type: 'application/json',
                }
              : {
                  response_mime_type: 'text/plain',
                }),
          },
        }),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini error ${response.status}: ${errorText.slice(0, 240)}`);
    }

    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts
      ?.map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
      .join('')
      .trim();

    if (!text) {
      throw new Error('Gemini response missing candidates[0].content.parts[].text');
    }

    return text;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateText(options: GenerateTextOptions): Promise<string> {
  if (isGeminiEndpoint()) {
    return invokeGeminiGenerateContent(
      options.systemPrompt,
      options.userPrompt,
      options,
      false,
    );
  }

  return invokeChatCompletion(
    [
      { role: 'system', content: options.systemPrompt },
      { role: 'user', content: options.userPrompt },
    ],
    options,
    false,
  );
}

export async function generateJson<T>(options: GenerateJsonOptions): Promise<T> {
  const content = isGeminiEndpoint()
    ? await invokeGeminiGenerateContent(
        options.systemPrompt,
        options.userPrompt,
        options,
        true,
      )
    : await invokeChatCompletion(
        [
          { role: 'system', content: options.systemPrompt },
          { role: 'user', content: options.userPrompt },
        ],
        options,
        true,
      );

  try {
    return JSON.parse(cleanJsonText(content)) as T;
  } catch (error) {
    if (!isGeminiEndpoint()) {
      throw error;
    }

    const repaired = await invokeGeminiGenerateContent(
      'You repair malformed JSON. Return only valid JSON and preserve the original meaning as much as possible.',
      `Repair this JSON so it becomes valid JSON. Return JSON only.\n\n${content}`,
      {
        model: options.model,
        temperature: 0,
        maxTokens: options.maxTokens ?? 1600,
      },
      true,
    );

    try {
      return JSON.parse(cleanJsonText(repaired)) as T;
    } catch (repairError) {
      const message = repairError instanceof Error ? repairError.message : String(repairError);
      const match = message.match(/position (\d+)/i);
      const position = match ? Number(match[1]) : -1;
      const cleaned = cleanJsonText(repaired);
      const snippet =
        position >= 0
          ? cleaned.slice(Math.max(0, position - 160), Math.min(cleaned.length, position + 160))
          : cleaned.slice(0, 320);
      console.error('Gemini repaired JSON parse failed:', snippet);
      throw repairError;
    }
  }
}
