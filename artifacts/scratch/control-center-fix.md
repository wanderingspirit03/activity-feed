# Control Center dashboard API 500 fix report

## Completed work

Implemented the requested Railway deployment fixes in `/tmp/af-check`:

- removed all stale compiled artifacts from `src/` and root
- hardened the Redis singleton in `src/lib/redis.ts`
- added structured JSON error handling for API routes
- copied `next.config.ts` into the Docker production stage
- tightened `.dockerignore` and `.gitignore`
- improved dashboard empty/error states in `src/app/page.tsx`
- verified the app with `npx next build`

## Files changed

- `CHANGES.md`
- `.dockerignore`
- `.gitignore`
- `Dockerfile`
- `src/app/api/actors/route.ts`
- `src/app/api/cron/route.ts`
- `src/app/api/dlq/route.ts`
- `src/app/api/health/route.ts`
- `src/app/api/memory/route.ts`
- `src/app/api/ops/route.ts`
- `src/app/api/ops/[opId]/action/route.ts`
- `src/app/api/ops/[opId]/route.ts`
- `src/app/api/runs/route.ts`
- `src/app/api/runs/[runId]/route.ts`
- `src/app/api/scores/route.ts`
- `src/app/page.tsx`
- `src/lib/api-error.ts`
- `src/lib/redis.ts`

## Deleted stale compiled artifacts

Deleted committed generated files including:
- all `src/**/*.js`
- all `src/**/*.js.map`
- all `src/**/*.d.ts`
- all `src/**/*.d.ts.map`
- `server.js`, `server.js.map`, `server.d.ts`, `server.d.ts.map`
- `next.config.js`, `next.config.js.map`, `next.config.d.ts`, `next.config.d.ts.map`
- `tsconfig.tsbuildinfo`

## Build verification

Command:

```bash
cd /tmp/af-check && npx next build
```

Result: success.

Notable output:
- app compiled successfully
- dynamic API routes were emitted for scores/runs/health/actors/cron/memory/dlq/ops

## Notes

I did not modify `server.ts`, WebSocket logic, or stream listener behavior.
