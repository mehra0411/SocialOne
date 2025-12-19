# DEVELOPMENT_PLAYBOOK_V2 — Post-Backend Execution

This file continues **after** `DEVELOPMENT_PLAYBOOK.md` ends.

It defines **HOW to make the system usable end‑to‑end**, using the same strict, prompt‑driven workflow you followed for the backend foundation.

---

## How to Use This File (Read First)

- ❌ Do NOT paste this entire file into Cursor
- ✅ Copy **ONE prompt at a time** into Cursor
- ✅ Follow phases **top → bottom**
- ✅ Review + commit after every prompt
- ❌ Do NOT jump ahead to frontend or billing

Architecture is already done. This file is about **controlled exposure and integration**.

---

# PHASE 6 — HTTP CONTROLLERS (EXPOSE EXISTING LOGIC)

## Goal
Expose existing services via HTTP **without adding business logic**.

---

## PROMPT 6.1 — Feed HTTP Controller

Create HTTP endpoints for Feed draft generation and publishing.

### Files
- `backend/src/modules/feed/feed.controller.ts`
- `backend/src/modules/feed/routes.ts`

### Endpoints
- `POST /api/feed/generate`
- `POST /api/feed/publish`

### Rules
- Controllers must:
  - Read `req.user.id`
  - Validate request payloads
  - Call existing services ONLY
- Apply middleware in this order:
  - `authenticate`
  - `requireActiveAccount`
  - `requireBrandAccess`
- ❌ No OpenAI logic in controller
- ❌ No Instagram logic in controller
- ❌ No DB queries in controller

Return JSON responses only.

---

## PROMPT 6.2 — Reels HTTP Controller

Create HTTP endpoints for Reel generation and publishing.

### Files
- `backend/src/modules/reels/reels.controller.ts`
- `backend/src/modules/reels/routes.ts`

### Endpoints
- `POST /api/reels/generate`
- `POST /api/reels/publish`

### Rules
- `generate` endpoint:
  - Creates reel record
  - Triggers AI worker (direct call for now)
- `publish` endpoint:
  - Only allows reels with `status = 'ready'`
- Apply middleware:
  - `authenticate`
  - `requireActiveAccount`
  - `requireBrandAccess`
- ❌ No fallback logic here
- ❌ No FFmpeg logic here

---

## PROMPT 6.3 — Mount Feature Routes

Update `backend/src/server.ts` to mount:

```ts
app.use('/api/feed', feedRoutes);
app.use('/api/reels', reelRoutes);
```

No other changes.

---

# PHASE 7 — LOCAL API VALIDATION (NO FRONTEND)

## Goal
Verify correctness before UI exists.

---

## PROMPT 7.1 — Health Endpoint

Add:

```
GET /health
```

Response:
```json
{ "status": "ok" }
```

Used for:
- Local validation
- AWS load balancers later

---

## PROMPT 7.2 — Manual API Validation

Using Postman or curl, verify:
- Admin APIs
- Feed generate
- Feed publish
- Reel generate
- Reel publish

❌ No frontend yet

---

# PHASE 8 — FRONTEND FOUNDATION (NO BUSINESS LOGIC)

## Goal
Create UI shell without coupling to backend logic.

---

## PROMPT 8.1 — Frontend Bootstrap

Create frontend using:
- React + Vite
- Tailwind CSS

Pages:
- `/login`
- `/signup`
- `/dashboard` (protected)
- `/admin` (hidden unless super_admin)

❌ No API calls
❌ No forms yet

---

## PROMPT 8.2 — Auth Integration

- Integrate Supabase Auth
- Handle login/signup
- Store JWT
- Protect routes

Dashboard can be empty.

---

# PHASE 9 — FEATURE UI (INCREMENTAL)

## Goal
Connect UI to backend **one feature at a time**.

---

## PROMPT 9.1 — Feed UI

- Brand selector
- Generate caption
- Draft preview
- Publish button

---

## PROMPT 9.2 — Reels UI

- Image upload
- Generate reel
- Status polling
- Publish reel

---

## PROMPT 9.3 — Admin UI

- User list
- Account status control
- Brand metadata view

---

# PHASE 10 — SAAS HARDENING (INTENTIONALLY DEFERRED)

These are **post‑validation phases** and are not expanded yet to avoid premature complexity:

- Billing (Stripe)
- Free trials
- Rate limiting
- Queues (BullMQ / SQS)
- Audit logs
- Analytics

They will be added **only after** end‑to‑end usage is proven.

---

## Summary

- This file is the **continuation**, not a rewrite
- Phases 6–9 are execution‑critical
- Phase 10 is intentionally deferred

Follow this file **top to bottom**.
Do not skip phases.

