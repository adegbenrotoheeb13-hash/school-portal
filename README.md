# School Portal

This is a standalone school portal. It is independent of the public school website and includes its own frontend, API functions, and database schema.

## Included roles
- Administrator
- Teacher
- Parent
- Student

## Deploy (Netlify only, no other accounts)

The portal runs entirely on Netlify: the site, the API functions and the database (Netlify Database, which is Postgres built into Netlify).

1. Put this folder in a GitHub repository (or use the Netlify CLI) and create a Netlify site from it. A deploy that runs a build is needed so Netlify can install `@netlify/database` and create the database. Dragging a folder into Netlify Drop will not create the database.
2. Add two environment variables (Site configuration > Environment variables):
   - `SESSION_SECRET`: a long random string, 32 or more characters.
   - `SETUP_KEY`: any secret word you choose; you will type it once on the setup page.
3. Deploy. Netlify creates the database on its own and runs every file in `netlify/database/migrations/` to build the tables. There is no database URL or password to copy.
4. Visit `/setup.html`, enter your `SETUP_KEY` and create the first administrator, then sign in at `/login.html`.

Do not run SQL against the Netlify database by hand. To change the tables later, add a new migration file in `netlify/database/migrations/` (name it with a later timestamp) and deploy.

## Connect it to a school website
The portal is independent. If you want a link back to your public website, replace the placeholder URL in `login.html` (`https://your-school-website.example/`) with the real website address. This is optional.

## Branding
The portal is branded simply as **School Portal**. Replace `assets/images/logo.jpg` with a neutral portal logo if desired.

## School fees and CBT

1. The tables for fees and CBT are already in the migration, so there is nothing to run.
2. For online payments add `PAYSTACK_SECRET_KEY` in Netlify (Site settings > Environment variables). Use the **test** key first.
3. In the Paystack dashboard (Settings > API Keys & Webhooks) set the webhook URL to `https://YOUR-SITE/api/paystack-webhook`.
4. In the portal: Tools > Configuration > School Name and Bank Details, then Fees > Fee Structure (for the current session and term), then Academics > CBT (teachers).

Manual payments (cash, transfer, POS) work without any Paystack setup.

## Modern mobile layout

- Every menu item, dashboard tile and stat card carries a small coloured icon (inline SVG, no external files).
- Dashboards show a greeting banner, quick actions and section tiles. Tapping a section opens a page of icon tiles.
- On phones: bottom navigation bar, slide-in menu, tables turn into cards, 16px inputs (no zoom on iPhone).
- The portal can be installed on a phone home screen (Add to Home Screen). `sw.js` caches the page shell only, never the API.
