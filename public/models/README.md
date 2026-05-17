# 3D models

Drop your `.glb` files here. They'll be served from the site root, e.g.
`public/models/quest_board.glb` is fetched at `/models/quest_board.glb`.

## MVP asset list (Fantasy Tavern theme)

| File                  | Purpose                          |
| --------------------- | -------------------------------- |
| `quest_board.glb`     | The wooden quest board centerpiece |
| `reward_chest.glb`    | Optional. Bottom-right accent.   |
| `wooden_table.glb`    | Optional. Foreground prop.       |
| `lantern.glb`         | Optional. Side light source.     |
| `coin.glb`            | Optional. Floating particle.     |
| `sparkle.glb`         | Optional. Reward shimmer.        |

## Export checklist

From Blender: `File → Export → glTF 2.0`, format **GLB**, `Apply Modifiers`
on, `Materials: Export`, animations only if needed. Aim for ≤ 1–2 MB per
file and avoid 4K textures. See `doc/06-3d-asset-pipeline.md` for the full
pipeline.
