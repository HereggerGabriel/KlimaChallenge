# KlimaChallenge — Claude Code Project Instructions

Bachelor-thesis app: a gamified public-transport tracker for KlimaTicket holders.
Research question: can tracking plus a gamified reward system change public-transport usage?
Thesis due end of March 2027. Current focus: a polished prototype (see `ROADMAP.md`).

---

## Session startup

1. Read `ROADMAP.md` to see the current milestone and the next open items.2. 
2. Read `docs/ARCHITECTURE.md` for architecture and key files.
3. Run `git status` and `git log --oneline -5`.
4. Run `npx tsc --noEmit` to get the baseline error count before touching anything (target: 0).

## End of session

1. Tick off finished items in `ROADMAP.md` and add new ones.
2. Update `.claude/memory/` if architecture or conventions changed.
3. Commit only when the user asks. Work happens on `dev/prototype`.

---

## Standing rules

### Colors
**Never hardcode hex values** except `#fff`.
Always use `Palette.*` from `constants/Colors.ts` (e.g. `Palette.blue.dark`, `Palette.green.mid`).

### Icons
Use `MaterialIcons` from `@expo/vector-icons/MaterialIcons`.
`IconSymbol` only maps a handful of SF Symbol names to Android/web, so unmapped icons render blank there. It is being phased out (M2). Never use it inside a `<Modal>`.

### Testing on device: development build
The app runs as an Expo **development build** (`expo-dev-client`), not Expo Go.
- Build once with `npx eas-cli build --profile development --platform android`, install the APK, then run `npx expo start`.
- Rebuild only when native dependencies or the app config change.

### Line endings
`.gitattributes` enforces LF everywhere, so normal edits are safe on every file.

### Supabase
Credentials come from `.env` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`); see `.env.example`.
Email confirmation is disabled for development. Re-enable it before the study.
