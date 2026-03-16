---
name: Always sync memory to both locations
description: Memory files must be written to both the C: system path and the project's .claude/memory/ folder
type: feedback
---

Always write memory updates to BOTH locations:
1. `C:\Users\gabri\.claude\projects\f--projects-TravelApp-travelapp\memory\` (system path)
2. `f:\projects\TravelApp\travelapp\.claude\memory\` (project path, tracked by git)

**Why:** The user wants memory portable across devices via git. The system only auto-writes to the C: path, so the project copy must be kept manually in sync.

**How to apply:** Any time you create or update a memory file, immediately write the same content to the corresponding file in both locations. Never update one without the other.
