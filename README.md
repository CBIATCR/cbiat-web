# CBIAT Web

Institutional website for the **Cámara Costarricense de Blockchain, Inteligencia Artificial y Tecnologías Emergentes (CBIAT)**.

## Direction

The first version takes inspiration from the information architecture and editorial clarity of DIGITALEUROPE while using CBIAT's existing navy/gold institutional identity. The site is intentionally designed to feel like a technology policy and industry institution rather than a crypto startup.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Native CSS design system
- Spanish + English locale architecture (`/es`, `/en`)

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The root route redirects to `/es`.

## Internationalization

Content lives in:

- `messages/es.json`
- `messages/en.json`

Spanish is the primary launch language. English is implemented from day one so content can evolve in parallel.

## Brand assets

The current header uses a temporary geometric CBIAT mark. Replace it with the official logo asset when received.


## Membership application email

The membership form at `/[lang]/afiliate` sends applications server-side using the Resend HTTP API.

Copy `.env.example` to `.env.local` for local development and configure these environment variables in the deployment platform:

- `RESEND_API_KEY` — Resend API key.
- `CBIAT_FORM_FROM_EMAIL` — verified sender, for example `CBIAT <formularios@cbiat.org>`.
- `CBIAT_FORM_TO_EMAIL` — optional destination; defaults to `info@cbiat.org`.

The form uses server-side validation plus a honeypot field for basic spam mitigation. No provider credentials are exposed to the browser.

## Accounts and people directory

For local development, start Docker and run these commands from the repository root:

```powershell
npm ci
if (!(Test-Path supabase/config.toml)) { npx supabase init }
npx supabase start
npx supabase migration up --local
npx supabase status
```

Set NEXT_PUBLIC_SUPABASE_URL to the local API URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to the local publishable key in .env.local. Start the app with npm run dev. The web app uses the signed-in user's session for all privileged operations. A service role key is unnecessary.

Register at /es/cuenta or /en/cuenta. Enable email confirmation in hosted Supabase Auth, configure the Site URL for the deployment, and configure outbound Auth email before inviting external users. Locally, open the mail inbox printed by the CLI to confirm a registration when email confirmation is enabled.

Pending accounts can edit their profiles. Approved accounts can enter the Chamber space. Disabled accounts cannot edit profiles or enter the space. Only approved people who choose public visibility appear in the directory. Account approval is independent of membership.

### Bootstrap the first administrator

Register and verify the intended account. In the target project's trusted SQL editor, replace the placeholder below with the verified account UUID from Authentication > Users. The returning row confirms the change. Use the local Studio SQL editor for local QA.

```sql
update public.profiles p
set status = 'approved', role = 'admin', approved_at = now()
from auth.users u
where u.id = p.id and u.email_confirmed_at is not null
  and p.id = '<verified-user-uuid>'::uuid
returning p.id, p.status, p.role;
```

Open /es/admin or /en/admin to review other accounts. Institutional affiliations and account roles are independent.
