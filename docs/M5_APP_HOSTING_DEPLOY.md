# M5: Firebase App Hosting Deployment

## Scope
- App Hosting deployment only (preview + production backends)
- Environment variable and secret hygiene
- Online smoke test for `/login -> /today -> submit`

## Files in this repo
- `apphosting.yaml`: shared runtime sizing defaults
- `apphosting.preview.yaml`: preview backend env + secret mapping
- `apphosting.production.yaml`: production backend env + secret mapping

## 1. Prepare Firebase project and app
1. Ensure Firebase CLI login:
   ```bash
   corepack pnpm exec firebase login
   ```
2. Select project:
   ```bash
   corepack pnpm exec firebase use <firebase-project-id>
   ```
3. Confirm your web app exists and copy its SDK config values:
   ```bash
   corepack pnpm exec firebase apps:list WEB
   corepack pnpm exec firebase apps:sdkconfig WEB <web-app-id>
   ```

## 2. Create preview and production backends
Create two App Hosting backends (interactive, same repo root, different backend IDs):

```bash
corepack pnpm exec firebase apphosting:backends:create --project <firebase-project-id>
corepack pnpm exec firebase apphosting:backends:create --project <firebase-project-id>
```

In the interactive flow, set backend names `sigmo-preview` and `sigmo-production`, choose the repo, root dir, and live branch.

After creation, open each backend in Firebase Console and connect the GitHub repository/branch used for rollouts if not already connected.

## 3. Configure environment names (Console)
In each backend settings page, set backend environment name so file selection is deterministic:
- Preview backend: `preview`
- Production backend: `production`

This makes App Hosting resolve:
- `apphosting.preview.yaml` for preview backend
- `apphosting.production.yaml` for production backend

## 4. Fill env values (file-level)
Edit both files and replace every `REPLACE_ME` value with your Firebase Web SDK values:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Keep this pinned in both files:
- `NEXT_PUBLIC_USE_FIREBASE_EMULATOR="0"` for `BUILD` and `RUNTIME`

Set allowlist (production requirement):
- `APP_HOST_ALLOWLIST` should include `*.hosted.app` and any custom domains, comma-separated.
  Example: `*.hosted.app,app.example.com`

## 5. Create and wire secrets
Create secrets for JWT signing:

```bash
corepack pnpm exec firebase -P <firebase-project-id> apphosting:secrets:set SIGMO_JWT_SECRET_PREVIEW
corepack pnpm exec firebase -P <firebase-project-id> apphosting:secrets:set SIGMO_JWT_SECRET_PROD
```

Grant backend service accounts access (replace with your service accounts from backend details page):

```bash
corepack pnpm exec firebase -P <firebase-project-id> apphosting:secrets:grantaccess SIGMO_JWT_SECRET_PREVIEW --backend sigmo-preview
corepack pnpm exec firebase -P <firebase-project-id> apphosting:secrets:grantaccess SIGMO_JWT_SECRET_PROD --backend sigmo-production
```

## 6. Roll out preview and production
Preview rollout from a branch:

```bash
corepack pnpm exec firebase -P <firebase-project-id> apphosting:rollouts:create sigmo-preview --git_branch <branch-name> --force
```

Production rollout from an audited commit:

```bash
corepack pnpm exec firebase -P <firebase-project-id> apphosting:rollouts:create sigmo-production --git_commit <commit-sha> --force
```

List backends:

```bash
corepack pnpm exec firebase -P <firebase-project-id> apphosting:backends:list
```

## 7. Online smoke test (`/login -> /today -> submit`)
Use the deployed backend URL (not localhost).

1. Open `/login` and authenticate with a valid Firebase Auth user.
2. Navigate to `/today` and verify the questionnaire loads without `500`/`401` errors.
3. Submit one full questionnaire.
4. Confirm submit API response is successful in Network tab (`/api/public/questionnaire/submit`, HTTP `200`).
5. Confirm one new answer record exists in your production datastore/admin view for that protocol/day.
6. Trigger `/api/public/questionnaire?shareLink=...` and confirm the server-side self-call succeeds from preview and prod URLs (no `fetch failed`, no `ECONNREFUSED`, no `http->https` mixed content). Check App Hosting rollout logs for errors.

## 8. Guardrails
- Never set `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=1` in App Hosting backends.
- In production, startup will fail if `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=1`.
- Do not store `JWT_SECRET` as plain text env; keep it in App Hosting secrets.
- Production now requires `JWT_SECRET`; missing value will fail at runtime startup instead of silently using a weak default.

## 9. Billing requirement
- App Hosting requires the Firebase project to be on the Blaze plan.
