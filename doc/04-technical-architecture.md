# Quest Invite Technical Architecture

## Recommended stack

```txt
Next.js
React
TypeScript
Tailwind CSS
React Three Fiber
Drei
Framer Motion
Zustand
Vercel
```

## Why this stack

### Next.js
Good for routing, deployment, and static web app structure.

### React
Good for building reusable UI components and form-driven experiences.

### TypeScript
Keeps data structures safer as the project grows.

### Tailwind CSS
Fast styling and consistent UI spacing.

### React Three Fiber
Lets you use Three.js inside React cleanly.

### Drei
Useful helpers for loading models, camera controls, environment, and text.

### Framer Motion
Great for UI transitions and polished interactions.

### Zustand
Lightweight state management.

### Vercel
Simple free hosting for frontend apps.

## Recommended folder structure

```txt
quest-invite/
  app/
    page.tsx
    create/
      page.tsx
    invite/
      page.tsx
  components/
    ui/
      Button.tsx
      Card.tsx
      Input.tsx
      Select.tsx
    quest/
      QuestForm.tsx
      QuestPreview.tsx
      QuestCard.tsx
      QuestResult.tsx
    scene/
      QuestScene.tsx
      TavernScene.tsx
      FloatingProps.tsx
  lib/
    questCodec.ts
    questDefaults.ts
    localResponse.ts
  stores/
    questStore.ts
  types/
    quest.ts
  public/
    models/
    textures/
    audio/
  styles/
    globals.css
```

## Routing

### `/`
Landing page.

### `/create`
Quest creation page.

### `/invite?q=...`
Recipient invite page.

## Data flow

```txt
QuestForm updates QuestData
QuestPreview displays QuestData
Generate Link encodes QuestData into URL
Invite page decodes URL
QuestScene renders decoded QuestData
Recipient response saved in localStorage
```

## No-backend rule
This MVP should not require:
- API routes
- database
- file storage
- auth
- server actions
- paid APIs

## Share link strategy
Use URL-safe encoded JSON.

Example:

```ts
const encoded = encodeQuestData(questData)
const link = `${window.location.origin}/invite?q=${encoded}`
```

## Important limitation
Encoded URLs have length limits.

Keep quest data short.
Do not store images or large data in URLs.

## Performance rules
- Use compressed `.glb` models.
- Keep first scene lightweight.
- Avoid large textures.
- Lazy-load 3D scene if needed.
- Use simple geometry for MVP.
- Test on mobile early.

## Deployment
Deploy to Vercel as a static Next.js app.

Recommended commands:

```bash
npm install
npm run dev
npm run build
```

## Future scaling options
Only add backend later if needed.

Possible later features:
- RSVP tracking
- custom user pages
- saved templates
- analytics
- premium themes
- image uploads

But for MVP, avoid all of these.
