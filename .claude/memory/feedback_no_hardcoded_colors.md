---
name: Use Palette not hardcoded hex colors
description: Feedback to use the custom Palette system instead of hardcoded hex values
type: feedback
---

Use `Palette` from `@/constants/Colors` for all color values in new/modified UI code.

**Why:** User defined a 9-color system (3×3: blue, green, red with light/mid/dark variants) specifically to be used throughout the app for design consistency.

**How to apply:** When writing or modifying styles, replace hardcoded hex like `#007AFF` with the closest `Palette.*` value. Ask the user which palette color to use if it's not obvious.
