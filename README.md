# Gatherly — event operations platform

Gatherly is a full-stack MERN event platform with an authenticated, role-aware REST API and a responsive React dashboard. Event managers publish and maintain events; members discover events, reserve places, and cancel their own registrations.

## Stack and architecture

- **MongoDB Atlas + Mongoose** for users, events, categories, favorites, reviews, notifications, and registrations
- **Express 5 / Node.js** REST API with layered MVC and repository boundaries
- **React 19 + Vite + React Router** multi-page role-aware client
- **JWT** access tokens, bcrypt password hashing, admin/user roles
- **Zod** request DTO validation, Helmet headers, CORS, and rate limits
- **Postman collection + Newman** for repeatable endpoint checks
- **Docker + Render blueprint** for a single-origin production deployment

```text
frontend/                   React + Vite customer/admin application
backend/
  api/
    routes/                 HTTP endpoints
    controllers/            Request/response handlers
    dto/                    Zod request schemas
    middleware/             Auth, validation, and error handling
    docs/                   OpenAPI specification
  services/                 Business rules and orchestration
  app.js                    Express app composition
  server.js                 Startup and graceful shutdown
database/
  config/                   MongoDB Atlas connection
  models/                   User, Event, Category, Favorite, Review, Notification, Inquiry
  repositories/             Mongoose persistence queries
  seeds/                    Safe demo event seed script
scripts/                    Postman/Newman API test runner
postman/                    Collection and local environment
```

## Features

- Account creation and login with signed JWT tokens; `GET /api/auth/me`
- Email verification codes for sign-up, passwordless sign-in, and password reset; Google sign-in with server-verified ID tokens
- Admin role bootstrap through `ADMIN_EMAIL`; all other signups receive the member role
- Separate admin workspace (operations dashboard, event studio, guest list, and insights) and customer experience (discovery, saved events, passes, account)
- Admin-only event create/update/delete, guest search/export, category performance, and seven-day booking activity
- Public published-event search, category filtering, sort, and pagination
- Database-managed event categories with an admin catalog, active/archive controls, and safeguards against deleting categories used by events
- Private drafts and cancelled events are hidden from public discovery
- Member event registration and self-service cancellation
- Atomic seat reservation prevents duplicate bookings and capacity overbooking
- Event registration counts are visible while attendee personal data stays private
- Responsive dashboard, event cards, search, metrics, empty states, and event editor
- Customer event detail views, saved-event shortlist, and reservation management
- Database-backed favorites sync across sessions; event pages include reviews and ratings
- In-app booking notifications include unread counts and read controls
- Customers can update their profile and review completed events they attended
- Public event gallery with a keyboard-accessible lightbox, responsive cinematic discovery page, saved dark theme, and dynamic review highlights
- Reservation confirmation flow, private QR ticket codes, one-time admin check-in endpoint, and downloadable `.ics` calendar invitations
- Public private-event inquiry form stored in MongoDB, protected admin inbox, inquiry status workflow, and submission rate limit
- Fast event search with a short input debounce, lazy-loaded cover images, responsive navigation, skip link, visible focus styles, and reduced-motion support

## Run locally

1. Install Node.js 20.19+ or 22.12+, then install dependencies:

   ```bash
   npm install
   npm install --prefix frontend
   ```

2. Create `.env` from `.env.example`. In MongoDB Atlas, create a database user, allow your development IP, and paste the driver URI into `MONGODB_URI`. Replace the placeholders; do not commit `.env`.

3. Set a unique random `JWT_SECRET` (at least 32 characters), and configure the email that will receive the first admin role in `ADMIN_EMAIL`. Set the same email in the Postman environment if you plan to run the collection.

4. For email codes, set `OTP_SECRET` to a unique random string of at least 32 characters and configure SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `EMAIL_FROM`). For Google sign-in, create a Google OAuth **Web application** client ID, allow your local website origin (`http://localhost:5173`), and set that client ID in both `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`. Keep `.env` private. Without these provider settings, their options show a setup message or the API returns a configuration error.

5. Start the API and React development server:

   ```bash
   npm run dev
   ```

   The API listens on `http://localhost:3000`; Vite serves the UI at `http://localhost:5173` and proxies `/api` requests to Express.

6. Create the first administrator using the email in `ADMIN_EMAIL`; other accounts receive the member role. Later accounts are regular members. The Postman environment includes local demo credentials; set `ADMIN_EMAIL=admin@example.test` if using those defaults.

7. Optional: seed example events after registering the admin account:

   ```bash
   npm run seed
   ```

   Seeding skips when the database already contains events.

8. Build the React application for production:

   ```bash
   npm run build
   $env:NODE_ENV='production'; npm start
   ```

   Express then serves `frontend/dist` and the API from the same origin.

   Or build and run the production container with Docker:

   ```bash
   docker build -t gatherly .
   docker run --env-file .env -p 3000:3000 gatherly
   ```

   `render.yaml` defines the production service. Add the Atlas URI and admin email in the Render dashboard; keep `JWT_SECRET` as a generated secret.

## REST API

All responses are JSON. Protected routes accept `Authorization: Bearer <token>`.

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | API and database health |
| GET | `/api/docs` | Public | Interactive Swagger API reference |
| GET | `/api/openapi.json` | Public | OpenAPI 3 specification |
| POST | `/api/auth/register` | Test compatibility | Legacy registration endpoint is disabled outside the API test runner |
| POST | `/api/auth/login` | Public | Authenticate and issue JWT |
| POST | `/api/auth/otp/signup/request` | Public | Email a sign-up verification code |
| POST | `/api/auth/otp/signup/verify` | Public | Verify code and create the account |
| POST | `/api/auth/otp/login/request` | Public | Request a passwordless email sign-in code |
| POST | `/api/auth/otp/login/verify` | Public | Verify code and issue a JWT |
| POST | `/api/auth/otp/password-reset/request` | Public | Request a password reset code |
| POST | `/api/auth/otp/password-reset/verify` | Public | Verify code and update password |
| POST | `/api/auth/google` | Public | Verify Google credential and issue a JWT |
| GET | `/api/auth/me` | Authenticated | Current user profile |
| PATCH | `/api/auth/me` | Authenticated | Update display name |
| GET | `/api/me/favorites` | Authenticated | List saved events |
| PUT / DELETE | `/api/me/favorites/:eventId` | Authenticated | Save or remove an event |
| GET | `/api/me/notifications` | Authenticated | Notification inbox and unread count |
| PATCH | `/api/me/notifications/:id/read` | Authenticated | Mark one notification as read |
| PATCH | `/api/me/notifications/read-all` | Authenticated | Clear unread notifications |
| GET | `/api/events` | Public / admin | Search, filter, sort, and paginate events |
| GET | `/api/events/:id` | Public for published | Event detail without attendee PII |
| POST | `/api/events` | Admin | Create an event |
| PUT | `/api/events/:id` | Admin | Update event fields |
| DELETE | `/api/events/:id` | Admin | Delete an event |
| GET | `/api/events/stats` | Admin | Event, booking, and revenue metrics |
| GET | `/api/events/attendees` | Admin | Search guest registrations (up to 500 results) |
| GET | `/api/events/my-registrations` | Authenticated | List the current user's event passes |
| GET | `/api/events/:id/reviews` | Public | Read reviews and rating summary |
| POST | `/api/events/:id/reviews` | Authenticated attendee | Review a completed event once |
| POST | `/api/events/:id/registrations` | Authenticated | Reserve a seat for current user |
| DELETE | `/api/events/:id/registrations/me` | Authenticated | Cancel current user’s reservation |

List query parameters: `search`, `category`, `status` (admins), `from`, `to`, `sortBy`, `order`, `page`, and `limit` (maximum 100).

## Postman verification

Import `postman/Event-Platform.postman_collection.json` and `postman/local.postman_environment.json` into Postman. Set the environment's `base_url`, demo account values if desired, and make sure `.env`'s `ADMIN_EMAIL` matches `admin_email`. Run the collection in order. It covers registration/login/profile, validation, role authorization, event CRUD, privacy, seat booking, duplicate prevention, and cancellation.

With Newman installed by `npm install`, run the same collection against a disposable in-memory MongoDB database with:

```bash
npm run test:api
```

The first test run downloads a MongoDB test binary; subsequent runs reuse it. The automated run does not connect to or modify Atlas. To run the collection from the Postman app instead, start the API with a reachable Atlas URI and keep the environment's `base_url` pointed at that server. Re-running the collection is supported; duplicate demo accounts are logged in after registration conflicts.

## Production notes

### Deploy the single-service app to Render

The root `render.yaml` and `Dockerfile` configure one Render web service that builds the React app and serves it with the Express API.

1. Commit and push the project to the GitHub repository connected to Render. Do not commit `.env`; it is ignored by Git.
2. In Render, choose **New → Blueprint**, connect the repository, and deploy the Blueprint from its root `render.yaml` file.
3. Fill in the requested values in Render: `MONGODB_URI`, `ADMIN_EMAIL`, SMTP settings, `EMAIL_FROM`, and both Google client ID fields. Render generates `JWT_SECRET` and `OTP_SECRET`. Use your existing Atlas database name `event_management_system`.
4. Add the production site origin (for example, `https://gatherly-event-platform.onrender.com`) to the Google OAuth client's **Authorized JavaScript origins**. Set the same origin in Render's `CLIENT_ORIGIN` if the final service URL differs from the default in `render.yaml`. The first admin account must be created with email-code sign-up using the exact `ADMIN_EMAIL` address.
5. In Atlas, allow the Render service's outbound IP ranges: after the Render service is created, open **Connect → Outbound** in its dashboard, then add those ranges in Atlas **Security → Network Access → IP Access List**. Avoid `0.0.0.0/0`; Atlas warns that it permits connection attempts from anywhere.
6. Wait for deployment to finish and open `<your-render-url>/api/health`. It should report `"database":"connected"`. Then test the site, OTP email, and Google sign-in from the public URL.

Render injects Docker service environment variables as build arguments. The Dockerfile passes only the public `VITE_GOOGLE_CLIENT_ID` into the Vite build; server secrets are used at runtime and are not compiled into frontend assets. Authentication uses bearer JWTs and supports OTP password reset; plan token refresh and account recovery policies before relying on this for a large public audience.
