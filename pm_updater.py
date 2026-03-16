"""
pm_updater.py — KlimaChallenge PM Excel Updater
================================================
Designed for the v5 seven-sheet structure. Claude Code runs this at the
end of each session to update all structured data. Narrative columns
(Reflection, Theory Reference, detailed diary text) are left with
placeholder prompts so the human can enrich them via the web interface.

Usage: fill in the __main__ block at the bottom and run:
    python pm_updater.py

Sheets handled:
    📊 Dashboard       — KPI numbers + velocity table
    📓 Session Diary   — one row per session (structured fields only)
    📐 Decision Log    — ADR entries when a major decision was made
    📋 Backlog         — mark items done, add new items
    ⚠️ Gotchas         — add newly discovered platform rules
    🎯 Milestones      — update milestone status / completion
    ✅ Feature Registry — add newly shipped features
"""

import sys
sys.stdout.reconfigure(encoding="utf-8")

from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import os

# ── Palette (must match build_pm_v3.py exactly) ───────────────────────────────
BLUE_DARK    = "00334F"
BLUE_MID     = "0B6C8A"
BLUE_XLIGHT  = "D6EEF5"
GREEN_DARK   = "418880"
GREEN_MID    = "3FB28F"
GREEN_XLIGHT = "E8F5E9"
RED_MID      = "E95B20"
RED_XLIGHT   = "FFF0ED"
AMBER        = "F59E0B"
AMBER_LIGHT  = "FEF3C7"
WHITE        = "FFFFFF"
OFF_WHITE    = "F8FAFB"
LIGHT_GRAY   = "EDF2F5"
MID_GRAY     = "C8D8E4"
TEXT_DARK    = "1A2E3B"
TEXT_MID     = "2D4A5A"
TEXT_LIGHT   = "5A7A8A"
PURPLE       = "7C3AED"
PURPLE_LIGHT = "EDE9FE"

PLACEHOLDER  = "[To be completed via web interface]"

# ── Style helpers ─────────────────────────────────────────────────────────────
def _fill(hex_color):
    return PatternFill("solid", fgColor=hex_color)

def _font(bold=False, size=9, color=TEXT_DARK, italic=False):
    return Font(bold=bold, size=size, color=color, italic=italic, name="Arial")

def _align(h="left", v="center", wrap=True):
    return Alignment(horizontal=h, vertical=v, wrap_text=wrap)

def _border(color=MID_GRAY):
    s = Side(style="thin", color=color)
    return Border(top=s, bottom=s, left=s, right=s)

def _style(cell, bg=WHITE, fg=TEXT_DARK, bold=False, size=9,
           h="left", v="center", wrap=True, italic=False, border_color=MID_GRAY):
    """Apply full style to a single cell."""
    cell.fill      = _fill(bg)
    cell.font      = _font(bold=bold, size=size, color=fg, italic=italic)
    cell.alignment = _align(h=h, v=v, wrap=wrap)
    cell.border    = _border(color=border_color)

def _row_bg(row_index, shade_even=True):
    """Alternating row background — even rows get LIGHT_GRAY."""
    return LIGHT_GRAY if (row_index % 2 == 0) == shade_even else WHITE


# ─────────────────────────────────────────────────────────────────────────────
class PMUpdater:
    """
    Loads the v5 KlimaChallenge PM Excel file and exposes methods for
    every routine post-session update. All methods are idempotent:
    they skip silently if the target row already exists.
    """

    def __init__(self, path: str):
        if not os.path.exists(path):
            raise FileNotFoundError(f"PM file not found: {path}")
        self.path = path
        self.wb   = load_workbook(path)
        self._sheets = {ws.title: ws for ws in self.wb.worksheets}

    def save(self, path: str = None):
        out = path or self.path
        self.wb.save(out)
        print(f"  ✓ Saved: {out}")

    def _get_sheet(self, name_fragment: str):
        for title, ws in self._sheets.items():
            if name_fragment.lower() in title.lower():
                return ws
        raise KeyError(f"Sheet containing '{name_fragment}' not found. "
                       f"Available: {list(self._sheets.keys())}")

    def _find_last_data_row(self, ws, start_row: int, col: str = "A") -> int:
        last = start_row - 1
        for row in ws.iter_rows(min_row=start_row, min_col=1, max_col=1):
            cell = row[0]
            if cell.value is not None:
                last = cell.row
        return last

    def _find_row_containing(self, ws, search_value, col_index: int = 1,
                              start_row: int = 1) -> int:
        for row in ws.iter_rows(min_row=start_row):
            cell = row[col_index - 1]
            if cell.value and search_value.lower() in str(cell.value).lower():
                return cell.row
        return -1

    # ──────────────────────────────────────────────────────────────────────────
    # 📊 DASHBOARD
    # ──────────────────────────────────────────────────────────────────────────

    def update_dashboard_kpis(self, sessions: int, features: int,
                               backlog: int, tech_debt: int, blockers: int):
        ws = self._get_sheet("Dashboard")
        print(f"  Updating Dashboard KPIs — sessions={sessions}, "
              f"features={features}, backlog={backlog}, "
              f"tech_debt={tech_debt}, blockers={blockers}")

        prev_vals = {}
        for merged in ws.merged_cells.ranges:
            top_left = ws.cell(merged.min_row, merged.min_col)
            if merged.min_row == 6:
                prev_vals[merged.min_col] = top_left.value

        new_vals  = {1: sessions, 3: features, 5: backlog, 7: tech_debt, 9: blockers}
        color_map = {1: BLUE_DARK, 3: GREEN_DARK, 5: AMBER, 7: GREEN_MID, 9: RED_MID}

        for col, val in new_vals.items():
            cell = ws.cell(row=6, column=col)
            cell.value = str(val)
            _style(cell, bg=LIGHT_GRAY, fg=color_map[col],
                   bold=True, size=22, h="center", wrap=False)

        prev_str = (f"prev sessions: {prev_vals.get(1,'—')} / "
                    f"{prev_vals.get(3,'—')} / {prev_vals.get(5,'—')} / "
                    f"{prev_vals.get(7,'—')} / {prev_vals.get(9,'—')}   "
                    "· Open Backlog = open feature/bug items; "
                    "Pre-Prod Blockers = separate infra items not counted above")
        note_cell = ws.cell(row=7, column=1)
        note_cell.value = prev_str
        _style(note_cell, bg=OFF_WHITE, fg=TEXT_LIGHT, italic=True, size=8)

    def add_velocity_row(self, session: str, date: str, focus: str,
                          features_n: int, category: str):
        ws = self._get_sheet("Dashboard")
        last_r = self._find_last_data_row(ws, start_row=22)

        for row in ws.iter_rows(min_row=22, max_col=1):
            if row[0].value == session:
                print(f"  ⚠️  Velocity row for {session} already exists — skipping.")
                return

        r = last_r + 1
        ws.row_dimensions[r].height = 18

        cumulative = 0
        for row in ws.iter_rows(min_row=22, max_row=last_r, min_col=4, max_col=4):
            for cell in row:
                if isinstance(cell.value, int):
                    cumulative += cell.value
        cumulative += features_n

        shade = (r % 2 == 0)
        bg = LIGHT_GRAY if shade else WHITE
        max_feats = 9
        bar_n = round((features_n / max_feats) * 10) if features_n > 0 else 0
        bar = "█" * bar_n + "░" * (10 - bar_n)
        bar_color = GREEN_MID if features_n >= 5 else (
            GREEN_DARK if features_n > 0 else TEXT_LIGHT)

        cols = [
            ("A", session,    {"bold": True, "fg": BLUE_MID, "wrap": False}),
            ("B", date,       {}),
            ("C", focus,      {"wrap": True}),
            ("D", features_n if features_n > 0 else "—",
                  {"h": "center",
                   "fg": GREEN_DARK if features_n > 0 else TEXT_LIGHT,
                   "bold": features_n >= 5}),
            ("E", category,   {"fg": TEXT_MID, "italic": True}),
            ("F", cumulative if features_n > 0 else "—",
                  {"h": "center", "fg": BLUE_MID, "bold": True}),
            ("G", bar,        {"fg": bar_color}),
        ]
        for col_letter, val, style in cols:
            cell = ws[f"{col_letter}{r}"]
            cell.value = val
            _style(cell, bg=bg,
                   fg=style.get("fg", TEXT_DARK),
                   bold=style.get("bold", False),
                   italic=style.get("italic", False),
                   h=style.get("h", "left"),
                   wrap=style.get("wrap", False))

        print(f"  Added velocity row: {session} · {features_n} features · "
              f"cumulative {cumulative}")

    # ──────────────────────────────────────────────────────────────────────────
    # 📓 SESSION DIARY
    # ──────────────────────────────────────────────────────────────────────────

    def add_session_row(self, session: str, date: str, scope: str,
                         what: str, why: str, problems: str,
                         alternatives: str, decisions: str,
                         features_n: int, effort: str, thesis_tag: str,
                         reflection: str = PLACEHOLDER):
        ws = self._get_sheet("Session Diary")

        if self._find_row_containing(ws, session, col_index=1, start_row=5) != -1:
            print(f"  ⚠️  Session Diary row for {session} already exists — skipping.")
            return

        legend_r = self._find_row_containing(
            ws, "Column colour guide", col_index=1, start_row=5)
        if legend_r == -1:
            legend_r = self._find_last_data_row(ws, start_row=5) + 2

        ws.insert_rows(legend_r)
        r = legend_r

        data_rows = legend_r - 5
        shade = (data_rows // 2) % 2 == 0
        bg = LIGHT_GRAY if shade else WHITE

        ws.row_dimensions[r].height = 90

        row_data = [
            ("A", session,      {"bold": True, "fg": BLUE_MID, "v": "top",
                                 "h": "center", "wrap": False}),
            ("B", date,         {"fg": TEXT_MID, "v": "top"}),
            ("C", scope,        {"bold": True, "fg": BLUE_DARK, "v": "top"}),
            ("D", what,         {"v": "top"}),
            ("E", why,          {"fg": GREEN_DARK, "v": "top"}),
            ("F", problems,     {"fg": RED_MID, "v": "top"}),
            ("G", alternatives, {"fg": TEXT_MID, "italic": True, "v": "top"}),
            ("H", decisions,    {"fg": BLUE_MID, "v": "top"}),
            ("I", str(features_n) if features_n > 0 else "—",
                  {"h": "center", "v": "top",
                   "fg": GREEN_MID if features_n > 0 else TEXT_LIGHT,
                   "bold": features_n > 0}),
            ("J", effort,       {"h": "center", "v": "top", "fg": TEXT_MID}),
            ("K", thesis_tag,   {"fg": AMBER, "italic": True, "v": "top"}),
            ("L", reflection,   {"fg": PURPLE, "v": "top",
                                 "italic": reflection == PLACEHOLDER}),
        ]

        for col_letter, val, style in row_data:
            cell = ws[f"{col_letter}{r}"]
            cell.value = val
            _style(cell, bg=bg,
                   fg=style.get("fg", TEXT_DARK),
                   bold=style.get("bold", False),
                   italic=style.get("italic", False),
                   h=style.get("h", "left"),
                   v=style.get("v", "center"),
                   wrap=True)

        print(f"  Added Session Diary row: {session} · {scope} · "
              f"{features_n} features")
        if reflection == PLACEHOLDER:
            print(f"  ℹ️  Reflection column left as placeholder — "
                  f"enrich via web interface after the session.")

    # ──────────────────────────────────────────────────────────────────────────
    # 📐 DECISION LOG
    # ──────────────────────────────────────────────────────────────────────────

    def add_adr(self, n: int, area: str, context: str, options: str,
                 decision: str, criteria: str, reversal: str, session: str,
                 bg_color: str = BLUE_XLIGHT):
        ws = self._get_sheet("Decision Log")

        for row in ws.iter_rows(min_row=5, max_col=2):
            if str(row[0].value) == str(n) or (
                    row[1].value and area.lower() in row[1].value.lower()):
                print(f"  ⚠️  ADR #{n} ({area}) already exists — skipping.")
                return

        last_r = self._find_last_data_row(ws, start_row=5)
        r = last_r + 1
        ws.row_dimensions[r].height = 80

        row_data = [
            ("A", str(n),    {"bold": True, "fg": BLUE_MID, "h": "center"}),
            ("B", area,      {"bold": True, "fg": BLUE_DARK}),
            ("C", context,   {"fg": TEXT_DARK}),
            ("D", options,   {"fg": TEXT_MID, "italic": True}),
            ("E", decision,  {"fg": GREEN_DARK}),
            ("F", criteria,  {"fg": TEXT_DARK}),
            ("G", reversal,  {"fg": RED_MID}),
            ("H", session,   {"h": "center", "fg": BLUE_MID, "bold": True}),
        ]

        for col_letter, val, style in row_data:
            cell = ws[f"{col_letter}{r}"]
            cell.value = val
            _style(cell, bg=bg_color,
                   fg=style.get("fg", TEXT_DARK),
                   bold=style.get("bold", False),
                   italic=style.get("italic", False),
                   h=style.get("h", "left"),
                   v="top")

        print(f"  Added ADR #{n}: {area}")

    # ──────────────────────────────────────────────────────────────────────────
    # 📋 BACKLOG
    # ──────────────────────────────────────────────────────────────────────────

    def mark_backlog_done(self, identifier: str, session_completed: str,
                           notes: str = ""):
        ws = self._get_sheet("Backlog")

        target_row = -1
        for row in ws.iter_rows(min_row=6):
            num_cell  = row[0]
            task_cell = row[2]
            if (str(num_cell.value) == str(identifier) or
                    (task_cell.value and
                     identifier.lower() in str(task_cell.value).lower())):
                target_row = num_cell.row
                break

        if target_row == -1:
            print(f"  ⚠️  Backlog item '{identifier}' not found.")
            return

        ws.row_dimensions[target_row].height = 28

        status_cell = ws.cell(row=target_row, column=7)
        status_cell.value = "✅ Done"
        _style(status_cell, bg=GREEN_XLIGHT, fg=GREEN_DARK, bold=True)

        target_cell = ws.cell(row=target_row, column=8)
        target_cell.value = session_completed
        _style(target_cell, bg=GREEN_XLIGHT, fg=GREEN_DARK)

        notes_cell = ws.cell(row=target_row, column=9)
        existing   = notes_cell.value or ""
        suffix     = f"  ·  Completed {session_completed}"
        if notes:
            suffix += f" — {notes}"
        if suffix not in existing:
            notes_cell.value = existing + suffix
        _style(notes_cell, bg=GREEN_XLIGHT, fg=TEXT_MID, italic=True)

        for col_idx in range(1, 7):
            cell = ws.cell(row=target_row, column=col_idx)
            cell.fill = _fill(GREEN_XLIGHT)
            cell.font = _font(size=9, color=TEXT_LIGHT,
                              bold=(col_idx in [1, 3]))

        print(f"  Marked backlog item '{identifier}' as done ({session_completed})")

    def add_backlog_item(self, num: str, category: str, task: str,
                          description: str, priority: str, effort: str,
                          target: str, notes: str, status: str = "⬜ Todo"):
        ws = self._get_sheet("Backlog")

        for row in ws.iter_rows(min_row=6, max_col=3):
            if (str(row[0].value) == str(num) or
                    (row[2].value and
                     task.lower() in str(row[2].value).lower())):
                print(f"  ⚠️  Backlog item '{num} — {task}' already exists — skipping.")
                return

        pre_prod_r = self._find_row_containing(
            ws, "PRE-PRODUCTION", col_index=1, start_row=6)
        if pre_prod_r == -1:
            pre_prod_r = self._find_last_data_row(ws, start_row=6) + 1

        ws.insert_rows(pre_prod_r)
        r = pre_prod_r

        priority_fills = {
            "🔴 Critical": RED_XLIGHT,
            "🟠 High":     "FFF4EC",
            "🟡 Medium":   AMBER_LIGHT,
            "🔵 Low":      BLUE_XLIGHT,
        }
        priority_colors = {
            "🔴 Critical": RED_MID,
            "🟠 High":     "E95B20",
            "🟡 Medium":   AMBER,
            "🔵 Low":      BLUE_MID,
        }
        bg = priority_fills.get(priority, LIGHT_GRAY)

        ws.row_dimensions[r].height = 48
        for col_idx, (val, style) in enumerate([
            (str(num),      {"bold": True, "fg": TEXT_DARK}),
            (category,      {}),
            (task,          {"bold": True}),
            (description,   {}),
            (priority,      {"fg": priority_colors.get(priority, TEXT_DARK),
                             "bold": "Critical" in priority}),
            (effort,        {}),
            (status,        {}),
            (target,        {}),
            (notes,         {"italic": True, "fg": TEXT_MID}),
        ], start=1):
            cell = ws.cell(row=r, column=col_idx)
            cell.value = val
            _style(cell, bg=bg,
                   fg=style.get("fg", TEXT_DARK),
                   bold=style.get("bold", False),
                   italic=style.get("italic", False))

        print(f"  Added backlog item: {num} — {task} ({priority})")

    # ──────────────────────────────────────────────────────────────────────────
    # ⚠️ GOTCHAS
    # ──────────────────────────────────────────────────────────────────────────

    def add_gotcha(self, area: str, rule: str, why: str, broken: str,
                    session: str, severity: str, thesis: str):
        ws = self._get_sheet("Gotchas")

        if self._find_row_containing(ws, area, col_index=1, start_row=5) != -1:
            print(f"  ⚠️  Gotcha '{area}' already exists — skipping.")
            return

        sev_bg = {
            "🔴 Critical": RED_XLIGHT,
            "🟠 High":     "FFF4EC",
            "🟡 Medium":   AMBER_LIGHT,
            "🔵 Info":     BLUE_XLIGHT,
        }
        sev_fg = {
            "🔴 Critical": RED_MID,
            "🟠 High":     "E95B20",
            "🟡 Medium":   AMBER,
            "🔵 Info":     BLUE_MID,
        }

        last_r = self._find_last_data_row(ws, start_row=5)
        r = last_r + 1
        ws.row_dimensions[r].height = 56
        bg = sev_bg.get(severity, WHITE)

        for col_letter, val, style in [
            ("A", area,     {"bold": True, "fg": BLUE_DARK}),
            ("B", rule,     {"bold": True,
                             "fg": RED_MID if "Critical" in severity
                             else TEXT_DARK}),
            ("C", why,      {}),
            ("D", broken,   {"fg": RED_MID, "italic": True}),
            ("E", session,  {"h": "center", "fg": BLUE_MID}),
            ("F", severity, {"h": "center",
                             "fg": sev_fg.get(severity, TEXT_DARK),
                             "bold": True}),
            ("G", thesis,   {"fg": AMBER, "italic": True}),
        ]:
            cell = ws[f"{col_letter}{r}"]
            cell.value = val
            _style(cell, bg=bg,
                   fg=style.get("fg", TEXT_DARK),
                   bold=style.get("bold", False),
                   italic=style.get("italic", False),
                   h=style.get("h", "left"))

        print(f"  Added gotcha: {area} ({severity})")

    # ──────────────────────────────────────────────────────────────────────────
    # 🎯 MILESTONES
    # ──────────────────────────────────────────────────────────────────────────

    def update_milestone(self, milestone_id: str, status: str,
                          completion: str, blockers: str = "—"):
        done  = status.startswith("✅")
        bg    = GREEN_XLIGHT if done else AMBER_LIGHT
        color = GREEN_DARK   if done else AMBER

        ws_m  = self._get_sheet("Milestones")
        m_row = self._find_row_containing(
            ws_m, milestone_id, col_index=1, start_row=6)

        if m_row == -1:
            print(f"  ⚠️  Milestone '{milestone_id}' not found in Milestones sheet.")
        else:
            for col_idx in range(1, 8):
                ws_m.cell(row=m_row, column=col_idx).fill = _fill(bg)
            status_cell = ws_m.cell(row=m_row, column=4)
            status_cell.value = f"{status}  ({completion})"
            _style(status_cell, bg=bg, fg=color, bold=True)
            blockers_cell = ws_m.cell(row=m_row, column=6)
            blockers_cell.value = blockers
            _style(blockers_cell, bg=bg, fg=TEXT_DARK)
            print(f"  Updated Milestones sheet : {milestone_id} → {status} ({completion})")

        ws_d  = self._get_sheet("Dashboard")
        d_row = self._find_row_containing(
            ws_d, milestone_id, col_index=1, start_row=9)

        if d_row == -1:
            print(f"  ⚠️  Milestone '{milestone_id}' not found in Dashboard table.")
        else:
            for col_idx in range(1, 11):
                ws_d.cell(row=d_row, column=col_idx).fill = _fill(bg)
            d_status = ws_d.cell(row=d_row, column=6)
            d_status.value = f"{status} ({completion})"
            _style(d_status, bg=bg, fg=color, bold=True)
            d_comp = ws_d.cell(row=d_row, column=8)
            d_comp.value = completion
            _style(d_comp, bg=bg, fg=color, bold=True)
            d_block = ws_d.cell(row=d_row, column=10)
            d_block.value = blockers
            _style(d_block, bg=bg, fg=TEXT_DARK, wrap=True)
            print(f"  Updated Dashboard table  : {milestone_id} → {status} ({completion})")

    # ──────────────────────────────────────────────────────────────────────────
    # ✅ FEATURE REGISTRY
    # ──────────────────────────────────────────────────────────────────────────

    def add_feature(self, num: int, name: str, category: str,
                     session: str, files: str, description: str,
                     xp_impact: str, also_modified: str = "—",
                     theory_ref: str = PLACEHOLDER,
                     thesis_tag: str = "—"):
        ws = self._get_sheet("Feature Registry")

        for row in ws.iter_rows(min_row=5, max_col=1):
            if str(row[0].value) == str(num):
                print(f"  ⚠️  Feature #{num} ({name}) already exists — skipping.")
                return

        cat_bg = {
            "Core":         BLUE_XLIGHT,
            "UI":           PURPLE_LIGHT,
            "UX":           GREEN_XLIGHT,
            "Auth":         "FEF9C3",
            "Onboarding":   "FEF9C3",
            "Feature":      "E0F2FE",
            "Gamification": GREEN_XLIGHT,
            "Settings":     LIGHT_GRAY,
            "Refactor":     LIGHT_GRAY,
            "Bug Fix":      RED_XLIGHT,
            "Stats":        BLUE_XLIGHT,
            "PM":           LIGHT_GRAY,
            "Polish":       PURPLE_LIGHT,
        }
        thesis_map = {
            "Core":         "Data Architecture",
            "UI":           "Interface Design",
            "UX":           "UX Design",
            "Auth":         "Auth Architecture",
            "Onboarding":   "FRE Design",
            "Feature":      "Feature Design",
            "Gamification": "Gamification Theory",
            "Settings":     "User Configuration",
            "Refactor":     "Software Quality",
            "Bug Fix":      "Bug Analysis",
            "Stats":        "Data Visualisation",
            "PM":           "Development Process",
            "Polish":       "UX Design",
        }

        bg = cat_bg.get(category, WHITE)
        if thesis_tag == "—":
            thesis_tag = thesis_map.get(category, "—")

        last_r = self._find_last_data_row(ws, start_row=5)
        r = last_r + 1
        ws.row_dimensions[r].height = 30

        row_data = [
            ("A", num,           {"h": "center", "bold": True, "fg": BLUE_MID}),
            ("B", name,          {"bold": True}),
            ("C", category,      {"fg": TEXT_MID}),
            ("D", session,       {"h": "center", "fg": BLUE_MID}),
            ("E", also_modified, {"fg": TEXT_MID, "italic": True, "h": "center"}),
            ("F", files,         {"fg": TEXT_MID, "italic": True}),
            ("G", description,   {}),
            ("H", xp_impact,     {"h": "center",
                                   "fg": GREEN_DARK if xp_impact not in
                                   ["—", "Display"] else TEXT_LIGHT}),
            ("I", theory_ref,    {"fg": PURPLE,
                                   "italic": theory_ref == PLACEHOLDER}),
            ("J", thesis_tag,    {"fg": AMBER, "italic": True}),
        ]

        for col_letter, val, style in row_data:
            cell = ws[f"{col_letter}{r}"]
            cell.value = str(val) if not isinstance(val, str) else val
            _style(cell, bg=bg,
                   fg=style.get("fg", TEXT_DARK),
                   bold=style.get("bold", False),
                   italic=style.get("italic", False),
                   h=style.get("h", "left"))

        print(f"  Added feature #{num}: {name} ({category}, {session})")
        if theory_ref == PLACEHOLDER:
            print(f"  ℹ️  Theory Reference left as placeholder — "
                  f"enrich via web interface if gamification-related.")

    def update_feature_modified(self, num: int, session: str):
        ws = self._get_sheet("Feature Registry")
        for row in ws.iter_rows(min_row=5, max_col=5):
            if str(row[0].value) == str(num):
                cell = row[4]
                existing = cell.value or "—"
                if session in existing:
                    print(f"  ⚠️  Feature #{num} already shows {session} in "
                          f"'Also Modified In' — skipping.")
                    return
                cell.value = existing.replace("—", "").strip()
                cell.value = (cell.value + f", {session}").lstrip(", ")
                print(f"  Updated feature #{num} 'Also Modified In' → {cell.value}")
                return
        print(f"  ⚠️  Feature #{num} not found in Feature Registry.")


# ─────────────────────────────────────────────────────────────────────────────
# __main__ — Claude Code fills this block and runs the script each session
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":

    PM_PATH = r"f:\projects\TravelApp\travelapp\KlimaChallenge_PM_v5.xlsx"

    pm = PMUpdater(PM_PATH)

    print("\n=== KlimaChallenge PM Updater ===\n")

    # ═══════════════════════════════════════════════════════════════════════════
    # SESSION 15 — 2026-03-16
    # Haptic feedback + Streak system
    # ═══════════════════════════════════════════════════════════════════════════

    pm.update_dashboard_kpis(
        sessions  = 15,
        features  = 44,
        backlog   = 11,
        tech_debt = 0,
        blockers  = 5,
    )
    pm.add_velocity_row(
        session    = "S15",
        date       = "Mar 16",
        focus      = "Haptic feedback throughout + streak system + streak badge on level card",
        features_n = 2,
        category   = "Gamification / Polish",
    )
    pm.add_session_row(
        session      = "S15",
        date         = "2026-03-16",
        scope        = "Haptic feedback · Streak system · UserLevelCard streak badge",
        what         = (
            "#45 Haptic feedback: expo-haptics wired throughout the app. "
            "ImpactFeedbackStyle.Medium on trip add (QuickAdd) and swipe-delete in trips.tsx. "
            "ImpactFeedbackStyle.Light on favorite card long-press add. "
            "NotificationFeedbackType.Success on level-up, quest/achievement/main-quest claim. "
            "#43 Streak system: new utils/streakSystem.ts with computeStreak(trips) — "
            "counts consecutive calendar days ending today or yesterday, returns 0 if streak broken. "
            "Displayed in UserLevelCard footer as 🔥 Xd badge (Palette.red.light, MaterialIcons local-fire-department). "
            "streak computed via useMemo([trips]) in user.tsx and passed as prop. Hidden when streak = 0. "
            "Files: utils/streakSystem.ts (new), components/ui/UserLevelCard.tsx, "
            "app/(tabs)/user.tsx (Write), app/trips.tsx, app/quests.tsx"
        ),
        why          = (
            "Haptics are table-stakes polish for a native app — they make every interaction feel intentional. "
            "Streak is a core retention mechanic; showing it on the level card keeps it visible "
            "without requiring a dedicated screen."
        ),
        problems     = (
            "expo-haptics was already installed (expo SDK default) — no install needed. "
            "user.tsx required full Write (CRLF file)."
        ),
        alternatives = (
            "Considered storing streak in AsyncStorage to avoid recomputing — rejected because "
            "computing from the trips array is O(n) and always accurate; no sync risk."
        ),
        decisions    = (
            "Streak starts from today if today has a trip, otherwise from yesterday — "
            "prevents streak breaking just because the user hasn't logged today's trip yet."
        ),
        features_n   = 2,
        effort       = "~2h",
        thesis_tag   = "Gamification / Engagement",
    )
    pm.mark_backlog_done("45", "S15", "expo-haptics wired to all key interactions")
    pm.mark_backlog_done("43", "S15", "computeStreak utility + 🔥 badge on UserLevelCard")
    pm.add_feature(
        num         = 43,
        name        = "Haptic feedback",
        category    = "Polish",
        session     = "S15",
        files       = "user.tsx, trips.tsx, quests.tsx",
        description = (
            "expo-haptics across all key interactions: trip add (Medium), favorite add (Light), "
            "swipe-delete (Medium), level-up / quest claim / achievement claim (Success notification)."
        ),
        xp_impact   = "—",
        thesis_tag  = "UX Design",
    )
    pm.add_feature(
        num         = 44,
        name        = "Streak system + badge",
        category    = "Gamification",
        session     = "S15",
        files       = "utils/streakSystem.ts (new), UserLevelCard.tsx, user.tsx",
        description = (
            "computeStreak(trips) counts consecutive days ending today or yesterday. "
            "Shown as 🔥 Xd badge in UserLevelCard XP footer row. Hidden at 0."
        ),
        xp_impact   = "—",
        thesis_tag  = "Gamification",
    )

    # ═══════════════════════════════════════════════════════════════════════════
    # SESSION 16 — 2026-03-16
    # Streak milestone rewards + Log Again feature
    # ═══════════════════════════════════════════════════════════════════════════

    pm.update_dashboard_kpis(
        sessions  = 16,
        features  = 46,
        backlog   = 10,
        tech_debt = 0,
        blockers  = 5,
    )
    pm.add_velocity_row(
        session    = "S16",
        date       = "Mar 16",
        focus      = "Streak milestone XP rewards + Log Again (replaces #47 recurring trip)",
        features_n = 2,
        category   = "Gamification / UX",
    )
    pm.add_session_row(
        session      = "S16",
        date         = "2026-03-16",
        scope        = "Streak milestone rewards · Log Again button · QuickAdd prefill",
        what         = (
            "Streak milestones: STREAK_MILESTONES array (3/7/14/30/60/100 days → 50/150/300/600/1000/2000 XP) "
            "and getNewMilestoneXP(streak, claimed) added to utils/streakSystem.ts. "
            "claimedMilestones state in user.tsx loaded on init/focus from @claimedStreakMilestones. "
            "After each trip add, checkStreakMilestones fires; if a milestone is newly hit, "
            "bonus XP awarded 1.8s after trip toast (haptic + level-up if triggered). "
            "Log Again: onLogAgain prop added to TripDetailModal; view mode shows Close + Log Again "
            "two-button row (green, replay icon). "
            "QuickAddTripModal gains optional prefill prop (PrefillData type) with useEffect([visible]) "
            "that populates all fields when modal opens; date resets to now. "
            "handleLogAgain in user.tsx: closes detail modal → sets prefillData state → opens QuickAdd. "
            "Files: utils/streakSystem.ts, components/ui/TripDetailModal.tsx, "
            "components/ui/QuickAddTripModal.tsx, app/(tabs)/user.tsx (Write)"
        ),
        why          = (
            "Milestone rewards give the streak system progression depth beyond a simple counter — "
            "they reward users who maintain long streaks and make the streak feel meaningful. "
            "Log Again replaces the vague #47 'recurring trip' item: favorites already handle the "
            "high-frequency repeat case; Log Again fills the gap for any past trip regardless of frequency."
        ),
        problems     = (
            "TripDetailModal Edit tool failed on first attempt (indentation mismatch); "
            "resolved by re-reading exact whitespace before editing. "
            "Milestone XP toast coordination: two toasts in quick succession (trip XP + milestone XP) "
            "resolved by delaying milestone toast by 1.8s."
        ),
        alternatives = (
            "Milestone XP could be summed with trip XP and shown in one toast — rejected because "
            "the delay makes the milestone feel like a separate reward rather than noise. "
            "Log Again could have re-logged without opening QuickAdd — rejected because user "
            "should be able to adjust the date/time before confirming."
        ),
        decisions    = (
            "Milestone awards are one-time (persisted to @claimedStreakMilestones) — "
            "a streak breaking and restarting does NOT re-award. "
            "prefill date always resets to now (not the original trip date) — "
            "the intent is to log a new trip today, not to duplicate a past date."
        ),
        features_n   = 2,
        effort       = "~3h",
        thesis_tag   = "Gamification / Engagement",
    )
    pm.mark_backlog_done(
        "47", "S16",
        "Replaced by Log Again button in TripDetailModal + QuickAdd prefill prop"
    )
    pm.add_feature(
        num         = 45,
        name        = "Streak milestone XP rewards",
        category    = "Gamification",
        session     = "S16",
        files       = "utils/streakSystem.ts, app/(tabs)/user.tsx",
        description = (
            "STREAK_MILESTONES: 3/7/14/30/60/100 days → 50/150/300/600/1000/2000 XP. "
            "One-time auto-award on milestone hit. Delayed XP toast (1.8s) + haptic. "
            "Claimed set persisted to @claimedStreakMilestones."
        ),
        xp_impact   = "Yes",
        thesis_tag  = "Gamification",
    )
    pm.add_feature(
        num         = 46,
        name        = "Log Again + QuickAdd prefill",
        category    = "UX",
        session     = "S16",
        files       = "TripDetailModal.tsx, QuickAddTripModal.tsx, app/(tabs)/user.tsx",
        description = (
            "TripDetailModal view mode: Close + Log Again two-button row (green, replay icon). "
            "QuickAddTripModal prefill prop: all fields pre-populated from past trip, date resets to now."
        ),
        xp_impact   = "—",
        thesis_tag  = "UX Design",
    )

    # ── SAVE ──────────────────────────────────────────────────────────────────
    pm.save()
    print("\n=== Done. Narrative columns (Reflection, Theory Reference) "
          "left as placeholders — enrich via web interface. ===\n")
