# KlimaChallenge — Claude Code Project Instructions

## Current session
**Last completed: S17** — next session is S18.
Update this line at the end of every session.

---

## New-session startup (do this automatically, without being asked)

1. **Load memory** — read `.claude/memory/project_state.md` and `.claude/memory/project_backlog.md`
2. **Git status** — run `git status` and `git log --oneline -5` to see what changed since last session
3. **TypeScript baseline** — run `npx tsc --noEmit` to know the error count before touching anything
4. **Pick from backlog** — identify the top priority item(s) unless the user already stated a goal

---

## End-of-session checklist (do this before signing off)

1. **Update memory files** — write updated `project_state.md` and `project_backlog.md` to **both** paths:
   - `f:\projects\TravelApp\travelapp\.claude\memory\`
   - `C:\Users\gabri\.claude\projects\f--projects-TravelApp-travelapp\memory\`
2. **Update session counter** — increment "Last completed" above
3. **Run PM updater** — fill in and run `python pm_updater.py` to update `KlimaChallenge_PM_v4.xlsx`
4. **Sync Trello** — update the Trello board using `node trello_sync.js` (see Trello rules below)
5. **Commit** — only if the user asks

---

## Standing rules (critical — easy to violate accidentally)

### Files with Windows CRLF line endings
`app/(tabs)/user.tsx` and `app/profile.tsx` use CRLF (`\r\n`) line endings with 4-tab indentation.
**Always use `Write` (full file rewrite) on these files — never `Edit`.**
The Edit tool cannot reliably match strings in CRLF files and will silently fail or corrupt the file.

### Icons inside Modals
Use **`MaterialIcons` only** inside RN `<Modal>` components.
`IconSymbol` (SF Symbols) is unreliable inside Modal on iOS — do not use it there.

### Colors
**Never hardcode hex values** except `#fff`.
Always use `Palette.*` from `constants/Colors.ts` (e.g. `Palette.blue.dark`, `Palette.green.mid`).

### Custom dev build required
The app uses `@react-native-community/datetimepicker` which requires a **custom Expo dev build**.
It does not work in standard Expo Go. Do not suggest Expo Go for testing date/time picker features.

---

## Memory sync rule
All memory files must be kept in sync across both paths listed above.
Never update one without updating the other.

---

## Trello sync rules

The project has a Trello board synced via `trello_sync.js`. Credentials are in `.env` (gitignored).

### When to update Trello (during a session, not just at the end)
- **Task started** → move its card from Backlog to Done (Current), or create a new card in Done (Current)
- **Task completed** → ensure the card is in Done (Current) with `[SXX]` prefix in the name
- **New backlog item identified** → `node trello_sync.js add Backlog "#NN Title" "Description" "M effort"`
- **Backlog item removed or changed** → update or delete the card

### Commands reference
```
node trello_sync.js add <list> <title> [desc] [labels]
node trello_sync.js done <card-id>
node trello_sync.js move <card-id> <list>
node trello_sync.js update <card-id> [--name ""] [--desc ""]
node trello_sync.js find <text>
node trello_sync.js lists
node trello_sync.js cards [list-name]
node trello_sync.js archive-done "Done (SXX-SYY)"
```

### Archiving threshold
When "Done (Current)" reaches ~20 cards, archive it:
```
node trello_sync.js archive-done "Done (S17-S22)"
```
This moves all cards to the named archive list and leaves Done (Current) empty.

### Token expiry
The Trello API token expires every 30 days. If sync fails with 401, ask the user to regenerate at:
`https://trello.com/1/authorize?expiration=30days&name=KlimaChallenge&scope=read,write&response_type=token&key=<KEY>`
