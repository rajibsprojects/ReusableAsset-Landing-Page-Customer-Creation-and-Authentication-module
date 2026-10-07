# PRD — Madam Boutique & Madam Fashions (Module 1)

## Original problem statement
Build Module 1 (Home + Customer Sign-Up/Login + reusable auth/session + Google Sheets/Drive content layer) of a premium, responsive, multipage Indian boutique website, following the embedded reference designs from the functional spec (v4) but translated to a blue-and-white palette. Modules 2 (Boutique ordering), 3 (Fashions store) and 4 (Order Status/Admin) are placeholders only.

## User choices
- Google auth: Emergent-managed Google Auth (isolated behind provider-independent auth service)
- Email: Resend (env-driven, provider-independent EmailService). Dev recipient: rajibsprojects@gmail.com
- Google integration: Apps Script Web App layer (NO service account). Sheet `1rkfwQ1dpoXGYlVIW3mbrb8s6pQyHbboQ`, tab `Owner_data`, header row + data rows. Until Apps Script is deployed, backend reads the public sheet CSV and falls back to local JSON.
- PIN lookup: India Post public API
- Logo: `business_logo` column in sheet (Drive link), text monogram fallback

## Architecture
React (CRA + Tailwind + shadcn) → FastAPI `/api` → MongoDB (users, user_sessions, email_verifications, password_reset_tokens, login_attempts, counters) ; FastAPI → Resend / Google Sheets (AppsScript|PublicSheet|Local providers) / India Post.
Auth: unified opaque session tokens (httpOnly cookie `session_token`, 7d) for both Google and email logins. Frontend: AuthProvider/AuthContext/useAuth/ProtectedRoute/AuthCallback + `utils/redirect.js` for return-to-intended-page.

## User personas
- Guest visitor (browses Home, contacts business)
- Retail customer (B2C) / Business customer (B2B) — signs up, logs in, manages profile; later places Boutique/Fashions orders
- Business owner (Phase 2 admin)

## Core requirements (static)
Home (Hero, About Business, Lines of Business, About Owner, Contact — dynamic from Sheet), TopBar/Header/Footer reusable, Sign-Up (Google + verified email, PIN auto-fill, B2B/B2C), Login (Google + email, forgot/reset), redirect-after-login, responsive, env-driven config, deployable to Netlify/Vercel, README + testing checklist.

## Implemented (2026-06)
- [x] Backend: auth (verify-email request/confirm, register, login w/ lockout, google/session, me, PUT me, logout, forgot/reset), content service with provider chain + cache + Drive URL conversion, pincode service, seed test user, indexes
- [x] Frontend: all Module 1 pages, components, auth infra, Phase-2 placeholders, 404
- [x] Apps Script `Code.gs` (getSheet / listImages / appendRows) for production switch
- [x] README (deployment, env template, checklist, known issues), `.env.example` files, `/app/auth_testing.md`
- [x] Tested by testing agent (iteration_1): backend 15/15; frontend flows pass. Fixed: email links used ingress Origin → now FRONTEND_URL; mobile horizontal overflow.
- [x] Module 1 fix batch (2026-09): country-code + digits-only phones; server-side duplicate mobile (cc + number, unique index); Google sign-up requires profile completion before customer creation; IST timestamps; transactional customer numbers via Apps Script `createCustomer` from `customer_series_master` (series initialised at 15, create-only, LockService); 4-min idle session timeout (backend + frontend); owner notification email; login/sign-up card order fix; sheet text-format fix. Verified iterations 5–6 (30/30 backend + UI flows). `1jpiygdMaW47DUt8ogKXaOsw773l3j80HDVsc8v6DGhQ` (tab `customer_master`); force re-sync pushed existing customers; verified iteration_4 (new API + UI signups write only to new sheet). CustomerMasterService upserts customers (key customer_no) via Apps Script `upsertRow` on register / first Google login / profile update; pending-retry on startup; `POST /api/integrations/customer-master/sync?force=true`; `GET /api/integrations/status`. Apps Script deployed (fails closed on API_KEY); content now served via Apps Script (`_meta.source = apps_script`). Verified iterations 2–3.

## Backlog (prioritized)
- P0 (Module 2): Madam Boutique requirement form (header + 5-line detail, dress-type/rate masters from sheets, requirement no. series, save to `madam_boutique_orders` via Apps Script appendRows, emails to owner + customer)
- P0 (Module 3): Madam Fashions store (catalogue left / order right, cart, order no. series, link to Boutique order)
- P1: Deploy Apps Script under client account and switch `CONTENT_PROVIDER=apps_script`; verified Resend domain sender
- P1: Google-login users prompted to complete profile before ordering (profile_complete flag already returned)
- P2 (Module 4): Order Enquiry/Status, Admin dashboard
- P2: Sheet-driven Lines-of-Business bullet lists (currently in `frontend/src/data/linesOfBusiness.js`)

## Next tasks
1. Client confirms Module 1 UI/visual fidelity; fill remaining `Owner_data` cells (about_business, about_owner, owner_photo_url, business_logo)
2. Start Module 2 using `useAuth` + `ProtectedRoute` + Apps Script appendRows contract


## 2026-10-07 — Email wiring update
- All customer emails (verification, welcome, password reset) now carry `Reply-To` = `business_email_address` read from business_owner_data (Owner_Data tab) via content_service; fallback `BUSINESS_NOTIFY_EMAIL` (.env).
- Owner "New Customer Registration" alert is sent TO the sheet's `business_email_address` (fallback .env) with Reply-To = the new customer's email.
- Sender stays `SENDER_EMAIL` in .env (`onboarding@resend.dev` test mode: Resend only delivers to rajibsprojects@gmail.com until a domain is verified). After domain verification only `.env SENDER_EMAIL` needs changing — no code change.
- Decision: duplicate email/mobile validation stays against MongoDB (user chose no change for now); sheet-based validation proposal documented in chat.
- MongoDB collections wiped on request (users, sessions, login_attempts, counters); customer_series_master reset to 1 by user.
- Registration email subjects (owner alert AND customer welcome) are now per-customer: `New Customer: {name} ({customer_no}) — Madam Fashions` so Gmail does not thread them.

## 2026-10-07 — Forked session re-pointed to NEW Google Sheets
- backend/.env now uses new Apps Script deployment (`AKfycbzAt1xp...`) + new sheet IDs (business `1mK6ooiU...`, customer_master `1pr61_y3...`, series `1rrYE2YS...`). Original config backed up at `/app/memory/.env.backup_original_sheets`.
- Apps Script secret lives in Script Property `API_KEY` (not in code) — missing property => every call returns `Unauthorized`.
- LEARNING: a forked preview COPIES the MongoDB of the original session. Old users caused "email already exists" and Google login attaching to old customer ids. Fixed by wiping auth collections; seed CUST-000000 re-created. Verified iteration_7 (9/9 backend + signup UI). QA record `qa.forktest.*@example.com` CUST-000001 now exists in new sheet; series at 2.
- User instruction: do NOT build Module 2/3 until explicitly asked.
- Seed test user DISABLED (`SEED_TEST_USER_EMAIL=""`) and all auth collections wiped again; user removed test rows from sheet and reset series to 1. Environment is now a clean slate for client-facing testing.
- Google "repeat sign-up logs into same customer" (reported): Emergent OAuth gateway does not forward `prompt=select_account` (verified: demobackend `/auth/v1/env/oauth` ignores prompt/login_hint; Google AccountChooser rejects non-Google continue URLs) so Google silently reuses the single signed-in browser account. Mitigation (frontend): `madam.googleIntent` sessionStorage ("signup"/"login"); AuthCallback warns + routes to /account with `state.alreadyRegistered` → `AlreadyRegisteredNotice` banner with sign-out button; hint under signup Google button. Verified iteration_8 (7/7, mocked callback).
