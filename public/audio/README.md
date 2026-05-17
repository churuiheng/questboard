# Audio assets

Drop `.mp3`, `.ogg`, or `.wav` files here. The scene auto-discovers each
of these paths and stays silent when a file is absent.

| File                            | When it plays                        |
| ------------------------------- | ------------------------------------ |
| `audio/scroll_open.mp3`         | Each time the recipient taps a scroll |
| `audio/quest_accepted.mp3`      | Once when they hit "Accept quest"    |
| `audio/ambient_tavern.mp3`      | Loops in the background while open   |

A small **🔊 Sound / 🔇 Muted** toggle appears in the top-right of `/invite`
as soon as any of the three files exists. The toggle persists to
`localStorage` (`questboard:muted`) so the recipient's preference sticks.

## Browser autoplay rules

Most browsers (including Safari and mobile Chrome) block audio until the
recipient has interacted with the page. The ambient track is configured
on mount but only starts after the first click or touch anywhere on the
document. SFX plays through cloned `<audio>` elements so rapid taps
don't cancel each other.

## Sizing

For MP3, target:

- **SFX**: ≤ 50 KB, mono, 128 kbps
- **Ambient**: ≤ 1 MB, 96 kbps mono is plenty for tavern murmur

Test on a mid-tier phone over slow 4G — heavy audio assets are the
single fastest way to make the invite page feel sluggish.
