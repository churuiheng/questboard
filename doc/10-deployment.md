# Deploying to Vercel

QuestBoard is a frontend-only Next.js 16 app — no database, no auth, no
server actions. That makes deployment about as simple as it gets:
push to GitHub, click "import" in Vercel, done.

This guide walks the full flow with a pre-flight check, the deploy
steps, env vars, and a post-deploy verification checklist.

---

## Pre-flight (5 minutes)

Before pushing live, verify the production build runs locally.

### 1. Ensure node_modules is fresh

If you've been switching machines or platforms, regenerate the lockfile:

```bash
rm -rf node_modules package-lock.json .next
npm install
```

This is the same step you ran when first cloning the repo — it makes
sure the native binaries (`@next/swc-*`, `sharp`) match your platform.

### 2. Run the production build

```bash
npm run build
```

This invokes `next build`, which:

- Type-checks the whole project (same as `npx tsc --noEmit`)
- Runs ESLint
- Bundles the client and server code
- Generates static pages for `/` and `/create`
- Prepares the dynamic OG image route (`/og`) for the edge runtime
- Prepares the dynamic `/invite` route

If it fails, fix the errors locally first. Common things that pass dev
mode but fail production:

- Unused imports — production build is stricter
- Server / client component boundary errors
- Missing `"use client"` directives on hooks-using components

### 3. Test the production server locally (optional but recommended)

```bash
npm run start
```

Opens at `http://localhost:3000`. Click through each route:

- `/` — landing page renders, hero animates in
- `/create` — form works, draft autosave fires, Generate Link → Copy
- `/invite?q=…` — 3D scene loads, scroll click opens card, Accept fires

If `npm run start` works, Vercel will too.

---

## Push to GitHub

Vercel deploys from a Git remote. If you haven't set one up yet:

```bash
git init
git add .
git commit -m "Initial QuestBoard MVP"
gh repo create questboard --public --source=. --push
```

Or via the GitHub web UI: create a new repo named `questboard`, then:

```bash
git remote add origin git@github.com:YOUR_USERNAME/questboard.git
git branch -M main
git push -u origin main
```

---

## Deploy to Vercel

### First-time setup

1. Go to **https://vercel.com/new** and sign in with your GitHub account.
2. Click **Import Project** and select the `questboard` repo.
3. Vercel auto-detects **Next.js** as the framework.
4. Leave the default build settings:
   - **Build Command**: `next build` (auto-set)
   - **Output Directory**: `.next` (auto-set)
   - **Install Command**: `npm install` (auto-set)
5. Click **Deploy**.

First build typically completes in 60–120 seconds.

### Environment variables

You can set these now (under **Environment Variables** before deploying)
or after the first deploy (in Project Settings → Environment Variables):

| Name                    | Required | Value                                     | What it does                              |
| ----------------------- | -------- | ----------------------------------------- | ----------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`  | optional | `https://your-project.vercel.app`         | Forces OG image and metadata absolute URLs to use this domain. Without it, falls back to `VERCEL_URL` (auto-set by Vercel). Useful once you have a custom domain. |

Nothing else needs to be configured. No database URLs, no API keys.

---

## Post-deploy verification

After the deploy finishes, Vercel hands you a URL like
`https://questboard-abc123.vercel.app`. Walk through these checks:

### 1. Landing page

Open the URL in a browser:

- [ ] Hero text staggers in
- [ ] Sample quest card renders with parchment + nails + title
- [ ] "Forge your quest" button pulses
- [ ] No console errors in DevTools

### 2. Create page

Click **Forge your quest** to reach `/create`:

- [ ] Form renders, recipient field auto-focuses
- [ ] Chip selection works (activity / when / reward)
- [ ] Difficulty cards animate with selected state
- [ ] Live preview updates as you edit
- [ ] "Saved 🤍" indicator pulses ~400ms after each change
- [ ] **Ready the link** generates a URL
- [ ] **Copy link** copies and shows "On your clipboard 🤍"

### 3. Invite page

Click **Open as recipient ↗** to open the invite:

- [ ] 3D scene loads (procedural board + scrolls if no custom GLB)
- [ ] Floating embers drift up the background
- [ ] Mute toggle in top-right (if any audio file is present)
- [ ] Tapping the scroll opens the parchment quest card overlay
- [ ] Typewriter reveals the personal message
- [ ] **Accept this quest** triggers sparkle burst + reveals the
      "Tell [sender] ↗" share button
- [ ] **Maybe later** marks as deferred
- [ ] Pagination dots appear and animate (with 2+ options)
- [ ] **×** closes; clicking the dim backdrop closes; Escape closes

### 4. Link unfurl

The real test. Copy the invite URL and:

- [ ] Paste into **iMessage to yourself** — preview should show the
      parchment card with quest title, recipient name, sender, activity,
      when, reward, and difficulty badge — all in Cinzel serif
- [ ] Paste into **Slack** — same preview
- [ ] Paste into **WhatsApp** / **Telegram** — same preview

Use **https://www.opengraph.xyz** or **https://socialsharepreview.com**
to inspect the OG tags directly if any platform shows a generic preview.

### 5. Mobile

Open the deployed URL on a real phone:

- [ ] `/create` form is comfortable to fill in
- [ ] Floating "See preview" button appears at bottom-right on mobile
- [ ] `/invite` 3D scene renders smoothly
- [ ] Tap targets are easy to hit
- [ ] No layout overflow horizontally

---

## Custom domain (optional)

If you have a domain you'd like to use:

1. In Vercel: **Project Settings → Domains**, add `your-domain.com`.
2. Vercel shows you DNS records to add at your domain registrar
   (typically a CNAME pointing at `cname.vercel-dns.com`).
3. After DNS propagates (usually within minutes), the domain is live.
4. **Set `NEXT_PUBLIC_SITE_URL=https://your-domain.com`** in env vars
   and redeploy so OG images use the canonical domain.

---

## Updating after the first deploy

Every `git push` to `main` triggers an automatic redeploy. PR branches
get **preview deploys** at unique URLs — useful for sharing in-progress
changes without affecting production.

To deploy a specific commit / branch / tag, use the **Deployments** tab
in Vercel and click **Redeploy** on any past deployment.

---

## Troubleshooting

### Build fails on Vercel but works locally

Almost always a TypeScript or ESLint error that's stricter in production:

- Check the build log for the exact file + line
- Fix locally, commit, push — Vercel rebuilds

### OG image shows generic Satori serif instead of Cinzel

The font fetch at edge runtime couldn't find a font file. Verify
`public/fonts/Cinzel.ttf` (or one of the legacy filenames) is committed
and present in the deployed build.

### 3D scene is blank or has WebGL errors

Check the browser console. If WebGL fails to initialize (older
Android devices, headless browsers, some VPNs), the scene won't render
but the 2D UI still works — the click-to-reveal quest card still
appears via the bottom "Tap the parchment" hint button.

### "This invite link looks scrambled"

The recipient's URL got truncated or had characters mangled by an
intermediate (some email clients reformat URLs aggressively). Try
generating a shorter quest (fewer options, shorter message).

---

## What this costs

For typical hobby use, Vercel's **Hobby plan** ($0) is plenty:

- 100 GB bandwidth/month
- Unlimited deployments
- Edge runtime for the OG image route
- Free SSL on all domains

You'd need to upgrade if you're getting consistently above ~10k unique
recipients/month, which the MVP probably won't hit.
