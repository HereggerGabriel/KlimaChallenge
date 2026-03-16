---
name: TravelApp color palette
description: Custom 9-color Palette defined in constants/Colors.ts
type: project
---

The app uses a custom `Palette` exported from `constants/Colors.ts`:

```ts
export const Palette = {
  blue:  { light: '#84c5dd', mid: '#0b6c8a', dark: '#00334f' },
  green: { light: '#9dcda2', mid: '#3fb28f', dark: '#418880' },
  red:   { light: '#eb6c4c', mid: '#e95b20', dark: '#e63c35' },
};
```

Import with: `import { Palette } from "@/constants/Colors";`

**Why:** All new UI work should use these palette values instead of hardcoded hex colors.
**How to apply:** When styling components, prefer `Palette.blue.mid` over `#007AFF`, etc.
