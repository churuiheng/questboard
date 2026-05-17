# Quest Invite 3D Asset Pipeline

## Goal
Use your own 2D and 3D assets to create a strong personal visual identity without increasing development cost.

## Recommended asset format
Use `.glb` for 3D models.

Why:
- works well with Three.js
- compact single-file format
- includes mesh, materials, and animations
- easy to load with React Three Fiber and Drei

## Blender export settings
Recommended export format:

```txt
File > Export > glTF 2.0
Format: GLB
Include: Selected Objects
Transform: +Y Up if needed
Geometry: Apply Modifiers
Materials: Export
Animations: Export only if needed
```

## MVP asset list
Start small.

### Required
- Quest board
- Background wall or simple environment
- Reward chest or coin icon
- Accept button frame
- Decorative props

### Optional
- Potion bottle
- Scroll paper
- Floating stars
- Tiny mascot
- Tavern table
- Candle / lantern

## First theme: Fantasy Tavern
Suggested assets:

```txt
quest_board.glb
reward_chest.glb
wooden_table.glb
lantern.glb
coin.glb
sparkle.glb
```

## 2D asset list
Use 2D assets for UI polish.

Examples:
- button border
- quest badge
- difficulty icons
- background patterns
- decorative dividers
- sticker-style icons

## Recommended visual direction
Keep it:
- cozy
- simple
- low-poly or stylized
- readable
- warm
- lightweight

Avoid:
- heavy realism
- large texture files
- overly detailed models
- complex shaders
- huge environments

## Performance targets
For MVP:
- each `.glb` should ideally be under 1 to 2 MB
- textures should be compressed
- avoid 4K textures
- keep polygon count modest
- test on mobile

## Loading models with Drei

```tsx
import { useGLTF } from "@react-three/drei";

export function QuestBoardModel() {
  const { scene } = useGLTF("/models/quest_board.glb");
  return <primitive object={scene} />;
}
```

## Preloading models

```tsx
useGLTF.preload("/models/quest_board.glb");
```

## Scene composition idea

```txt
Camera
  -> Quest board centered
  -> Reward chest bottom right
  -> Lantern left side
  -> Floating particles
  -> 2D quest UI overlay on top
```

## Important UX rule
Do not let 3D visuals reduce readability.

The invite content must always be clear.

Use:
- dark overlay
- card background
- high contrast text
- large buttons
- simple camera angle

## Asset reuse strategy
Build assets in reusable packs.

Example:

```txt
Tavern Pack
Forest Pack
Potion Pack
Reward Pack
UI Frames Pack
```

This lets future apps reuse the same branding and reduce development time.
