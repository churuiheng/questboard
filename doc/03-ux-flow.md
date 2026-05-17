# Quest Invite UX Flow

## UX principle
The user should feel like they are creating a mini game quest, not filling out a boring form.

## Main pages

```txt
/                 Landing page
/create           Quest creation page
/invite?q=...     Recipient invite page
```

## Landing page

### Goal
Explain the idea quickly and encourage the user to create their first quest.

### Content structure
1. Hero section
2. Example quest card
3. Create Quest button
4. Small explanation

### Hero copy example

```txt
Turn any invite into a tiny RPG quest.
Ask someone out, plan a hangout, or send a playful mission in seconds.
```

### Primary CTA

```txt
Create Your Quest
```

## Create page

### Layout
Use a two-column layout on desktop:

```txt
Left: Quest form
Right: Live preview
```

On mobile:

```txt
Form first
Preview below
```

## Quest form sections

### Section 1: Quest Basics
- Quest title
- Recipient name
- Sender name

### Section 2: Quest Details
- Activity/location
- Date/time text
- Reward text
- Difficulty

### Section 3: Personal Message
- Short message

### Section 4: Theme
- Theme selector

For MVP, only one theme is required.

## Form UX rules
- Keep fields short.
- Use placeholder examples.
- Show live preview immediately.
- Avoid long instructions.
- Let users generate a link even if some fields are blank.
- Use defaults to reduce friction.

## Default quest example

```txt
Quest Title: The Great Ramen Expedition
Recipient: Player Two
Sender: Player One
Activity: Ramen dinner
Date: Friday night
Reward: +50 Happiness
Difficulty: Cozy
Message: Your presence is requested for a delicious side quest.
```

## Invite page flow

### Step 1: Scene enters
- Background fades in.
- Quest board or card appears.
- Small soundless animation plays.

### Step 2: Message reveal
- Typewriter text reveals the personal message.
- Quest details appear one by one.

### Step 3: Choice
Buttons:

```txt
Accept Quest
Maybe Later
```

### Step 4: Response state
If accepted:

```txt
Quest Accepted!
Prepare for adventure.
```

If maybe later:

```txt
Quest marked as pending.
The adventure can wait.
```

## Mobile UX notes
Most users will open invites on mobile.

Prioritize:
- large buttons
- readable text
- fast load
- vertical layout
- minimal typing
- no tiny UI controls

## Interaction feel
Add simple game feel:
- button hover scale
- card bounce-in
- reward sparkle effect
- soft camera movement
- typewriter text
- subtle background parallax

## Accessibility rules
- Text must be readable over 3D backgrounds.
- Always include a dark overlay if needed.
- Do not rely only on color to show states.
- Buttons must have clear labels.
- Keep animation gentle.

## UX success test
Give the app to someone with no explanation.

They should understand within 5 seconds:
- what the invite is
- who sent it
- what action they can take
