# M6-2 AI QuestionnaireEngine Runbook

## Scope
- Introduce AI QuestionnaireEngine adapter with strict validation and safe fallback.
- Do not change Firestore schema/doc IDs/collection names.
- Do not change UI/routes/login flow.

## Engine selection
- `QUESTION_ENGINE=template|ai`
- `NEXT_PUBLIC_QUESTION_ENGINE` is also supported, but server-side `QUESTION_ENGINE` is preferred.
- Forced template mode:
  - `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=1`, or
  - `NODE_ENV=test`

## Server-only AI env vars
- `AI_PROVIDER` (supported: `openai`, `mock`)
- `AI_API_KEY` (required for `openai`, keep as secret)
- `AI_MODEL` (optional, default `gpt-4o-mini`)
- `AI_API_BASE` (optional override, default OpenAI chat completions endpoint)
- `AI_ADMIN_TOKEN` (required secret for protecting `/api/admin/ai/questions`)

## Preview / Production App Hosting
- Preview backend:
  - `QUESTION_ENGINE=ai`
  - `AI_PROVIDER=openai` (or `mock`)
  - `AI_API_KEY` as secret
  - `AI_MODEL` optional
  - `AI_ADMIN_TOKEN` as secret
- Production backend:
  - `QUESTION_ENGINE=template`
  - `AI_*` not required

## Safety behavior
- AI output is validated strictly:
  - exactly 5 questions
  - no duplicates
  - text non-empty, <=80 chars, no emoji
  - no yes/no phrasing
  - no vague "feelings" style prompts
  - 1-5 scale only
- Any AI route/network/validation failure falls back to template output.
- Fallback never blocks `/today` or submission.
