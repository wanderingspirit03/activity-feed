# Control Center API 500 Fixes

## What changed

### 1. Removed stale compiled artifacts
- Deleted all committed compiled output from `src/`:
  - `*.js`
  - `*.js.map`
  - `*.d.ts`
  - `*.d.ts.map`
- Deleted compiled root artifacts:
  - `server.js`
  - `server.js.map`
  - `server.d.ts`
  - `server.d.ts.map`
  - `next.config.js`
  - `next.config.js.map`
  - `next.config.d.ts`
  - `next.config.d.ts.map`
  - `tsconfig.tsbuildinfo`

This removes the stale CommonJS/compiled-file conflicts so Next.js uses the TypeScript source of record.

### 2. Hardened Redis initialization
Updated `src/lib/redis.ts` to make the singleton resilient in production:
- exports `redisUrl`
- switched to lazy connection creation
- added `error` event handler to prevent unhandled crashes
- increased `maxRetriesPerRequest` from `1` to `3`
- added `connectTimeout: 10000`
- added bounded retry backoff strategy

### 3. Added shared API error helper
Created `src/lib/api-error.ts` so routes consistently return JSON error responses with:
- `error`
- `detail`

### 4. Wrapped API routes with graceful error handling
Improved route handlers so failures return structured JSON instead of empty 500s.
Updated:
- `src/app/api/scores/route.ts`
- `src/app/api/runs/route.ts`
- `src/app/api/runs/[runId]/route.ts`
- `src/app/api/health/route.ts`
- `src/app/api/actors/route.ts`
- `src/app/api/cron/route.ts`
- `src/app/api/memory/route.ts`
- `src/app/api/dlq/route.ts`
- `src/app/api/ops/route.ts`
- `src/app/api/ops/[opId]/route.ts`
- `src/app/api/ops/[opId]/action/route.ts`

### 5. Fixed Docker production config
Updated `Dockerfile` to copy `next.config.ts` into the production stage:
- `COPY --from=builder /app/next.config.ts ./`

Also expanded `.dockerignore` to exclude stale compiled artifacts from the Docker context.

### 6. Prevented reintroduction of compiled artifacts
Updated `.gitignore` with TypeScript compiled-output ignore rules so stale build files are less likely to be committed again.

### 7. Improved dashboard empty/error states
Updated `src/app/page.tsx`:
- success rate shows `—` when there are no score entries
- health shows `Checking...` when health data is not available yet
- average duration shows `—` when no timing data exists
- softened the top-level panel error message to be less alarming

## Verification
Build verified successfully with:

```bash
cd /tmp/af-check && npx next build
```

Result: build completed successfully and all API routes compiled as dynamic server routes.
