# HDRI environment maps

Drop an HDR or EXR file here and the scene will pick it up automatically.

The default lookup path is `public/hdri/tavern.hdr`. To use a different file, pass `environmentUrl` to `<TavernScene>` from `InviteScene.tsx`.

## What it does

An HDRI (high-dynamic-range image) wraps the scene with realistic lighting:

- Shiny metal materials reflect the surrounding environment.
- Ambient color tinges every surface, even those in shadow.
- The procedural directional / ambient lights are dialed down automatically so the scene isn't over-exposed.

## Where to get one

Free CC0 HDRIs:

- https://polyhaven.com/hdris (filter by "Indoor → Restaurant/Pub" for tavern vibes)
- https://hdri-haven.com/

For interior scenes, a 1K or 2K HDRI (.hdr, 1–4 MB) is plenty. Avoid 4K+ unless you really need it — the file size hits page load.

## Optional: use the HDRI as the visible background too

Pass `environmentBackground={true}` to `<TavernScene>`:

```tsx
<TavernScene
  className="absolute inset-0"
  questCount={total}
  onSelectQuest={openAt}
  environmentBackground
/>
```

When off (default), the HDRI only contributes lighting and the page's dark gradient stays as the visible backdrop.
