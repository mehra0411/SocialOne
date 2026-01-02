# Instagram Content Platform (Cursor‑Ready)

## 1. Project Overview

This project is a **SaaS-based Instagram content creation and publishing platform** designed for brands, creators, and agencies.

The platform allows users to:
- Sign up and access a shared SaaS interface
- Create and manage one or more **brands** (workspaces)
- Connect an **Instagram Business account** to each brand
- Generate and publish:
  - **Feed posts** (image + caption)
  - **Reels** (AI‑generated video, with fallback support)

The system is designed as an **MVP with Reels included from day one**, while remaining scalable for future features such as white‑labeling, agencies, and custom domains.

This README describes **WHAT to build**.
Execution details live in `DEVELOPMENT_PLAYBOOK.md`.

---

## 2. SaaS Model & Roles

### User (Default)
- Signs up via Supabase Auth
- Accesses only their own data
- Manages brands, media, and publishing

### Brand (Tenant Boundary)
- A brand represents a workspace
- Each brand belongs to exactly one user (MVP)
- Each brand connects to one Instagram account

### Super Admin (Platform Level)
- Internal role
- Can view all users and brands
- Can pause / restrict / suspend accounts
- Can moderate content metadata

---

## 3. Non‑Negotiable Engineering Rules

These rules apply to the **entire system**.

1. **NO inline CSS**
2. **NO inline JavaScript**
3. **Tailwind CSS only for styling**
4. **Frontend never talks directly to Instagram or AI APIs**
5. **All security enforced in backend**
6. **No hidden or auto‑generated behavior**

These rules ensure the codebase is **Cursor‑safe, auditable, and scalable**.

---

## 4. Final Tech Stack (Locked)

### Frontend
- React + Vite
- Tailwind CSS
- Hosted on **Vercel**

### Backend
- Node.js (Express)
- Hosted on **AWS EC2**
- Handles:
  - Auth enforcement
  - Instagram OAuth
  - Feed publishing
  - Reels generation & publishing
  - AI orchestration

### Data & Auth
- **Supabase**
  - Authentication
  - PostgreSQL database
  - File storage (MVP)

### AI Providers
- OpenAI (captions, hooks, hashtags)
- AI Video Provider (Runway / Pika / Luma) — **Primary**
- Image → Video (FFmpeg) — **Fallback**

### External APIs
- Instagram Graph API

---

## 5. High‑Level Architecture

```
User → Frontend (Vercel)
Frontend → Backend API (AWS EC2)
Backend → Supabase / AI Providers / Instagram
```

- Frontend is shared across all users
- Backend enforces authentication, authorization, and isolation
- Supabase remains constant across environments

---

## 6. Core User Flows

### 6.1 Authentication
- User signs up / logs in
- Supabase issues JWT
- Backend validates JWT on every request

### 6.2 Brand Management
- User creates brand
- Brand stores:
  - Name
  - Category
  - Voice guidelines
  - Brand colors

### 6.3 Instagram Account Connection

1. User clicks **Connect Instagram**
2. Backend starts Meta OAuth
3. User approves permissions
4. Backend stores encrypted tokens
5. Frontend receives success/failure state

Tokens are **never exposed** to frontend.

---

## 7. Feed Posts (MVP)

### Generation
- User provides theme or idea
- Backend generates:
  - Caption + hashtags (OpenAI)
  - Image (or selects uploaded image)
- Draft saved in DB

### Publishing
- Backend creates Instagram media container
- Publishes to Feed
- Updates status

---

## 8. Reels (AI‑Primary, MVP Included)

### Primary: AI‑Generated Video
- Backend builds video prompt
- Calls AI video provider
- Validates output (15–30 seconds)
- Stores video

### Fallback: Image → Video
- Triggered if AI fails or times out
- FFmpeg applies motion templates
- Generates MP4

### Publishing
- Backend creates Reel media container
- Publishes to Instagram
- Updates status

---

## 9. Account State Enforcement

Each user account has a status:
- active
- paused
- restricted
- suspended

Backend middleware enforces:
- Paused/restricted users cannot publish or generate
- Suspended users cannot access the platform

---

## 10. Super Admin Capabilities

Super Admin can:
- View all users
- View all brands
- Pause / restrict / suspend accounts
- Review content metadata

Admin access is enforced via backend role checks.

---

## 11. UI & Styling Rules

### Font
- **Inter** (system‑safe stack)

### Color System
- Primary: indigo‑600
- Success: emerald‑600
- Warning: amber‑500
- Error: red‑600
- Neutral base: slate‑50 → slate‑900

### Rules
- No gradients
- No inline styles
- Component‑based UI only

---

## 12. Scalability & Future Extensions

Supported without re‑architecture:
- White‑label agencies
- Custom branding per client
- Custom domains
- Subscription billing

---

## 13. Execution Reference

This file defines **WHAT to build**.

For **HOW to build**, follow:

```
DEVELOPMENT_PLAYBOOK.md
```

That file defines:
- Cursor prompts
- Execution order
- DB migrations
- Safe development flow

---

## 14. Summary

- SaaS‑ready architecture
- One frontend, one backend
- Strong isolation & security
- Reels included in MVP
- Cursor‑friendly development

This README is the **single source of truth for product scope and architecture**.
http://localhost:5173/dashboard
