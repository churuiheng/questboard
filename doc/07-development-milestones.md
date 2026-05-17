# Quest Invite Development Milestones

## Milestone 1: Project setup
Goal: Get the app running locally.

Tasks:
- Create Next.js project with TypeScript.
- Install Tailwind CSS.
- Install React Three Fiber.
- Install Drei.
- Install Framer Motion.
- Create base folder structure.
- Create landing page.

Suggested command:

```bash
npx create-next-app@latest quest-invite --typescript --tailwind --eslint --app
cd quest-invite
npm install three @react-three/fiber @react-three/drei framer-motion zustand
npm run dev
```

## Milestone 2: Quest data model
Goal: Define the core quest data.

Tasks:
- Create `types/quest.ts`.
- Create `lib/questDefaults.ts`.
- Create `lib/questCodec.ts`.
- Test encoding and decoding manually.

Done when:
- Quest data can be converted into a URL-safe string.
- Encoded data can be decoded back into the same object.

## Milestone 3: Create Quest page
Goal: Let users create an invite.

Tasks:
- Build `QuestForm`.
- Build `QuestPreview`.
- Add default values.
- Update preview live as the user types.
- Add Generate Link button.
- Add Copy Link button.

Done when:
- User can create a quest and copy a link.

## Milestone 4: Invite page
Goal: Render the shared invite.

Tasks:
- Create `/invite` page.
- Decode `q` search parameter.
- Render quest card.
- Handle missing or invalid quest data.
- Add Accept Quest and Maybe Later buttons.
- Save response in localStorage.

Done when:
- Opening a generated link shows the correct quest invite.

## Milestone 5: Visual polish
Goal: Make the experience feel like a game.

Tasks:
- Add Framer Motion card entrance animation.
- Add typewriter text effect.
- Add button hover/tap feedback.
- Add reward reveal animation.
- Add simple background particles.

Done when:
- The app feels charming even before 3D assets are added.

## Milestone 6: 3D scene integration
Goal: Add your personal visual branding.

Tasks:
- Create or export first `.glb` assets.
- Add React Three Fiber Canvas.
- Load quest board model.
- Add camera and lighting.
- Add simple idle animation.
- Overlay 2D UI on top.

Done when:
- Invite page has a lightweight 3D scene behind or around the quest card.

## Milestone 7: Mobile optimization
Goal: Make it usable on phones.

Tasks:
- Test create page on mobile.
- Test invite page on mobile.
- Reduce model sizes if needed.
- Increase button sizes.
- Ensure text is readable.
- Check loading time.

Done when:
- Invite page feels good on mobile.

## Milestone 8: Vercel deployment
Goal: Share the MVP publicly.

Tasks:
- Push project to GitHub.
- Import project into Vercel.
- Deploy.
- Test generated links on real devices.

Done when:
- You can send a Quest Invite link to another person.

## Milestone 9: Real user testing
Goal: See if people enjoy using it.

Test questions:
- Did they understand the app immediately?
- Did creating a quest feel easy?
- Did the invite feel fun to receive?
- Would they send it to someone else?
- What theme would they want next?

## Milestone 10: Template expansion
Only after MVP works.

Possible next templates:
- Date Quest
- Food Quest
- Study Quest
- Birthday Quest
- Apology Quest
- Friendship Quest
- Valentine Quest

## Recommended development order

```txt
1. Data model
2. Form
3. Preview
4. Link generation
5. Invite page
6. Response buttons
7. UI animation
8. 3D scene
9. Mobile polish
10. Deploy
```

Do not start with 3D first.

Build the functional loop first, then make it beautiful.
