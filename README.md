# Madam Boutique & Madam Fashions — Module 1

Premium, responsive multipage website for an Indian boutique & fashion apparel business.
**Module 1** delivers: Home page, Customer Sign-Up (Google + verified email), Customer Login, reusable auth/session infrastructure, Google Sheets/Drive content layer, responsive Header/Footer, Phase-2 placeholders.

## Stack
- **Frontend**: React 19, React Router 7, Tailwind CSS, shadcn/ui, Framer Motion, lucide-react, sonner
- **Backend**: FastAPI (Python), MongoDB (Motor), Resend (email), httpx
- **Content**: Google Sheets via Google Apps Script Web App (with public-sheet and local fallbacks)
- **Auth**: Emergent-managed Google Auth + email/password (bcrypt) with email verification; unified DB-backed sessions (httpOnly cookie)

## Repository layout
```
backend/
  server.py                 FastAPI app, routers, CORS, startup (indexes, seed)
  core/                     config (env), database
  auth/                     models, security (bcrypt/tokens), service, router, dependencies
  auth/providers/           emergent_google.py  <- swap to change social provider
  services/email/           EmailService (provider-independent) + Resend/Console providers + templates
  services/content/         ContentService + AppsScript / PublicSheet / Local providers
  services/pincode/         PincodeService + India Post provider
  routers/                  content_router (/api/content/business), pincode_router (/api/pincode/{pin})
  data/                     business_owner_data.json (local fallback content)
frontend/src/
  config/site.js            brand, routes, nav links, image URLs
  services/                 apiClient, authService, contentService, pincodeService
  auth/                     AuthContext, AuthProvider, useAuth, ProtectedRoute, AuthCallback, providers/emergentGoogle
  hooks/                    useBusinessContent (Sheets data), usePincodeLookup
  utils/                    formatError, links, validators, redirect
  data/                     linesOfBusiness lists, default business content
  components/layout         TopBar, Header, MobileNav, Footer, Logo, Layout
  components/home           Hero, AboutBusiness, LinesOfBusiness, AboutOwner, ContactUs
  components/auth           LoginForm, SignupForm (EmailVerificationStep + SignupDetailsForm), Forgot/Reset forms, UserProfile
  components/common         SectionHeading, Motifs, Reveal, PageLoader
  pages/                    Home, Login, Signup, ForgotPassword, ResetPassword, Account, Placeholder, NotFound
google-apps-script/Code.gs  Apps Script Web App to deploy under the business Google account
```

## Routes
| Route | Status |
|---|---|
| `/` | Home (dynamic content from Google Sheet) |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | Functional |
| `/account` | Protected (redirects to login and back) |
| `/boutique`, `/fashions`, `/order-status`, `/admin` | "Coming in Phase 2" placeholders |

## Environment variables
Copy `backend/.env.example` → `backend/.env` and `frontend/.env.example` → `frontend/.env`.

| Variable | Purpose |
|---|---|
| `MONGO_URL`, `DB_NAME` | MongoDB connection |
| `CORS_ORIGINS` | Comma-separated allowed origins (`*` echoes any origin) |
| `FRONTEND_URL` | Used for email links when the request has no Origin header |
| `EMAIL_PROVIDER` | `resend` or `console` (logs instead of sending) |
| `RESEND_API_KEY`, `SENDER_EMAIL` | Resend credentials. Use a verified domain sender in production |
| `CONTENT_PROVIDER` | `auto` (Apps Script → public sheet → local), `apps_script`, `public_sheet`, `local` |
| `GOOGLE_SHEET_ID_BUSINESS`, `GOOGLE_SHEET_TAB_OWNER` | `business_owner_data` spreadsheet and tab (`Owner_data`) |
| `APPS_SCRIPT_URL`, `APPS_SCRIPT_API_KEY` | Deployed Apps Script `/exec` URL + shared secret |
| `CONTENT_CACHE_SECONDS` | Server-side content cache TTL |
| `PINCODE_API_URL` | PIN lookup base URL (India Post) |
| `EMERGENT_AUTH_SESSION_URL` | Google auth session exchange endpoint |
| `EXPOSE_DEV_LINKS` | `true` returns verification/reset links in API responses (dev only; set `false` in production) |
| `SEED_TEST_USER_*` | Optional seeded email/password customer (leave blank in production) |
| `REACT_APP_BACKEND_URL` (frontend) | Backend base URL (no trailing slash) |

## Google Sheets / Drive content
The `Owner_data` tab has a header row and one data row with columns:
`business_name, business_tagline, about_business, line_of_business1, line_of_business1_details, line_of_business2, line_of_business2_details, owner_name, about_owner, owner_photo_url, business_phone_number, business_whatsapp_number, business_email_address, business_website_address, business_address_1, business_address_2, business_citi, business_state, business_pin, business_facebook_url, business_instagram_url, business_linkedIn_url, business_logo`

- Empty cells and the text `To be added` fall back to defaults in `backend/data/business_owner_data.json`.
- `owner_photo_url` / `business_logo` accept Google Drive share links (`https://drive.google.com/file/d/<ID>/view`) — converted automatically to direct image URLs. Files must be shared as "Anyone with the link".
- Multi-paragraph text: separate paragraphs with a line break inside the cell.

### Switching to the Apps Script API (production)
1. Open the `business_owner_data` spreadsheet → Extensions → Apps Script; paste `google-apps-script/Code.gs`.
2. Project Settings → Script properties → add `API_KEY` (any long random string).
3. Deploy → New deployment → Web app → Execute as **Me**, access **Anyone** → copy the `/exec` URL.
4. Set `APPS_SCRIPT_URL` and `APPS_SCRIPT_API_KEY` in the backend env. No code changes needed.

## Authentication
- Sessions are opaque tokens stored in `user_sessions` (7 days) and set as an httpOnly `session_token` cookie; a `Bearer` header is also accepted.
- Email sign-up flow: request verification → email link `/signup?token=…` → complete details → account + session.
- Passwords: min 8 chars, letter + number; bcrypt hashed. 5 failed logins → 15 min lockout per IP+email.
- Redirect-after-login: `ProtectedRoute` passes `state.from`; Google flow stores it in `sessionStorage` (`utils/redirect.js`). Modules 2/3 wrap their submit flows with `useAuth()` / `ProtectedRoute` and get the same behaviour.
- To replace Emergent Google auth: implement `start()` / `extractSessionId()` in `frontend/src/auth/providers/` and `fetch_google_session()` in `backend/auth/providers/`.

## Local development
```
cd backend && pip install -r requirements.txt && uvicorn server:app --port 8001 --reload
cd frontend && yarn && yarn start
```

## Deployment (Netlify / Vercel)
Frontend (static React build):
- Build command `yarn build`, publish dir `frontend/build`, env `REACT_APP_BACKEND_URL=https://<backend-host>`.
- SPA rewrite: Netlify `_redirects` → `/* /index.html 200`; Vercel `vercel.json` → `{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}`.

Backend (FastAPI): deploy to any Python host (Render, Railway, Fly.io, Vercel Python functions, etc.) with the env vars above and a MongoDB Atlas URI. Set `CORS_ORIGINS` to the frontend origin. All API routes are under `/api`.

## Testing checklist (Module 1)
- [x] Home renders all sections with Google Sheet data; fallback when sheet unreachable
- [x] Navigation (desktop + mobile menu), Contact anchor, Phase-2 placeholders
- [x] Google login (Emergent) → `/account`, redirect back to intended page
- [x] Email verification request → link → details form → account created → welcome email
- [x] Duplicate registration blocked (409); invalid/expired/used links handled
- [x] Password rules enforced; show/hide toggle
- [x] Login success / invalid login / lockout after 5 failures
- [x] Forgot password → reset link → new password → old sessions revoked
- [x] Session persists across reload; logout clears cookie
- [x] Protected `/account` redirects guests to `/login` and back after login
- [x] PIN lookup auto-fills city/state; graceful message when service unavailable
- [x] Responsive layouts: mobile / tablet / desktop, no horizontal scroll

## Known issues / notes
- Resend test mode delivers only to the Resend account owner's address until a domain is verified.
- The `public_sheet` provider requires the sheet to be shared "Anyone with the link → Viewer"; use Apps Script in production for private sheets.
- Lines-of-business bullet lists are maintained in `frontend/src/data/linesOfBusiness.js`; the card intro paragraphs come from the sheet.
