"""
KlimaChallenge PM Updater
=========================
Persistent helper script for updating KlimaChallenge_PM.xlsx.
Designed to be called by Claude at the start/end of each session.

Usage:
    pm = PMUpdater()
    pm.start_session(10, '2026-03-16')        # updates header + metrics
    pm.add_session_row(...)                    # dashboard timeline
    pm.add_velocity_row(...)                   # milestones velocity
    pm.update_sprint_plan(...)                 # milestones sprint plan
    pm.update_milestone(...)                   # milestone tracker
    pm.mark_backlog_done(id, notes)            # backlog item -> done
    pm.add_backlog_item(...)                   # new backlog item
    pm.update_backlog_notes(id, notes)         # update backlog notes only
    pm.add_feature(...)                        # feature registry
    pm.add_arch_session(...)                   # architecture session log
    pm.save()                                  # write to disk
"""

import openpyxl
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

FILE = os.path.join(os.path.dirname(__file__), 'KlimaChallenge_PM.xlsx')

# ── Sheet name constants ──────────────────────────────────────────────────────
SH_DASHBOARD  = '📊 Dashboard'
SH_BACKLOG    = '📋 Backlog & Tasks'
SH_MILESTONES = '🎯 Milestones'
SH_ARCH       = '🏗️ Architecture'
SH_FEATURES   = '✅ Feature Registry'


class PMUpdater:
    def __init__(self, path=FILE):
        self.path = path
        self.wb = openpyxl.load_workbook(path)

    def save(self):
        self.wb.save(self.path)
        print(f'Saved: {self.path}')

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _find_row(self, ws, col_a_value):
        """Return 1-based row number where column A == col_a_value, or None."""
        for i, row in enumerate(ws.iter_rows(values_only=True), 1):
            if row[0] == col_a_value:
                return i
        return None

    def _find_row_containing(self, ws, col_a_substr):
        """Return 1-based row number where column A contains the substring."""
        for i, row in enumerate(ws.iter_rows(values_only=True), 1):
            if row[0] and isinstance(row[0], str) and col_a_substr.lower() in row[0].lower():
                return i
        return None

    def _last_data_row(self, ws):
        """Return 1-based index of the last row that has any data."""
        last = 0
        for i, row in enumerate(ws.iter_rows(values_only=True), 1):
            if any(v is not None for v in row):
                last = i
        return last

    def _set_row(self, ws, row_num, values: dict):
        """Set cells in a row. values = {col_letter: value}."""
        for col, val in values.items():
            ws[f'{col}{row_num}'].value = val

    # ── DASHBOARD ─────────────────────────────────────────────────────────────

    def update_dashboard_header(self, session_n: int, date: str):
        """Update 'Session X Complete | Date: ...' banner."""
        ws = self.wb[SH_DASHBOARD]
        ws['A2'].value = f'Session {session_n} Complete  |  Date: {date}  |  Platform: React Native / Expo'

    def restore_dashboard_headers(self):
        """
        Restore Row 5 to its correct column-label state.
        Row 5 = headers; Row 6 = current values; Row 7 = previous-session values.
        """
        ws = self.wb[SH_DASHBOARD]
        ws['A5'].value = 'Sessions Completed'
        ws['C5'].value = 'Features Shipped'
        ws['E5'].value = 'Backlog Items Left'
        ws['G5'].value = 'Tech Debt Items'
        ws['I5'].value = 'Pre-Prod Blockers'
        print('Dashboard: Row 5 headers restored')

    def update_dashboard_metrics(
        self,
        sessions: int,
        features: int,
        open_items: int,
        prev_sessions: int,
        prev_features: int,
        prev_open: int,
        tech_debt_count: int,
        preprod_count: int = None,   # leave None to keep existing value
    ):
        """
        Update the KPI tile rows.
        Row 5 = column headers (never overwrite — call restore_dashboard_headers if needed).
        Row 6 = current values (big numbers).
        Row 7 = previous-session values (shown as delta reference).
        """
        ws = self.wb[SH_DASHBOARD]
        # Current (row 6)
        ws['A6'].value = sessions
        ws['C6'].value = features
        ws['E6'].value = open_items
        ws['G6'].value = tech_debt_count
        if preprod_count is not None:
            ws['I6'].value = preprod_count
        # Previous (row 7)
        ws['A7'].value = str(prev_sessions)
        ws['C7'].value = str(prev_features)
        ws['E7'].value = str(prev_open)

    def add_session_row(
        self,
        session_id: str,   # e.g. 'S10'
        date: str,
        status: str,
        deliverables: str,
        files: str,
        notes: str,
    ):
        """
        Append a session row to the SESSION TIMELINE table.
        Inserts after the last Sx row found.
        """
        ws = self.wb[SH_DASHBOARD]
        # Find the last 'Sx' row
        last_session_row = None
        for i, row in enumerate(ws.iter_rows(values_only=True), 1):
            if row[0] and isinstance(row[0], str) and row[0].startswith('S') and row[0][1:].isdigit():
                last_session_row = i
        target_row = (last_session_row + 1) if last_session_row else self._last_data_row(ws) + 1

        # Only write if not already there
        if ws.cell(row=target_row, column=1).value != session_id:
            self._set_row(ws, target_row, {
                'A': session_id, 'B': date, 'C': status,
                'D': deliverables, 'E': files, 'F': notes,
            })
            print(f'Dashboard: added {session_id} at row {target_row}')
        else:
            print(f'Dashboard: {session_id} already exists at row {target_row}, skipping')

    # ── BACKLOG & TASKS ───────────────────────────────────────────────────────

    def update_backlog_header(self, session_n: int, date: str):
        ws = self.wb[SH_BACKLOG]
        ws['A2'].value = f'Priority-ordered remaining work  |  Updated {date}  |  Session {session_n} complete'

    def mark_backlog_done(self, item_id: int, notes: str = None):
        """Mark a backlog item as done by its # (column A)."""
        ws = self.wb[SH_BACKLOG]
        row = self._find_row(ws, item_id)
        if row is None:
            print(f'Backlog: item #{item_id} not found')
            return
        ws[f'G{row}'].value = '✅ Done'
        if notes:
            ws[f'I{row}'].value = notes
        print(f'Backlog: #{item_id} marked Done (row {row})')

    def update_backlog_notes(self, item_id: int, notes: str):
        """Update only the notes column for a backlog item."""
        ws = self.wb[SH_BACKLOG]
        row = self._find_row(ws, item_id)
        if row is None:
            print(f'Backlog: item #{item_id} not found')
            return
        ws[f'I{row}'].value = notes
        print(f'Backlog: #{item_id} notes updated (row {row})')

    def add_backlog_item(
        self,
        item_id: int,
        category: str,       # e.g. 'Tech Debt', 'Feature', 'Bug Fix'
        task: str,
        description: str,
        priority: str,       # e.g. '🔵 Low', '🟡 Medium', '🟠 High', '🔴 Critical'
        effort: str,         # e.g. 'XS (30m)', 'S (2-4h)', 'M (4-8h)', 'L (1-2d)'
        status: str = '⬜ Todo',
        session_target: str = 'Any',
        notes: str = None,
    ):
        """Append a new backlog item. Skips if item_id already exists."""
        ws = self.wb[SH_BACKLOG]
        if self._find_row(ws, item_id) is not None:
            print(f'Backlog: #{item_id} already exists, skipping')
            return
        r = self._last_data_row(ws) + 1
        self._set_row(ws, r, {
            'A': item_id, 'B': category, 'C': task, 'D': description,
            'E': priority, 'F': effort, 'G': status, 'H': session_target, 'I': notes,
        })
        print(f'Backlog: #{item_id} "{task}" added at row {r}')

    # ── MILESTONES ────────────────────────────────────────────────────────────

    def update_milestone(
        self,
        name: str,           # e.g. 'M6: Stats & Insights'
        status: str,         # e.g. '✅ Complete', '⬜ Planned', '🔄 In Progress'
        completion_pct: str, # e.g. '100%', '60%'
        target_date: str = None,
        deliverables: str = None,
        notes: str = None,
    ):
        """Update a milestone row by name match in column A."""
        ws = self.wb[SH_MILESTONES]
        row = self._find_row_containing(ws, name)
        if row is None:
            print(f'Milestones: "{name}" not found')
            return
        ws[f'C{row}'].value = status
        ws[f'D{row}'].value = completion_pct
        if target_date:
            ws[f'B{row}'].value = target_date
        if deliverables:
            ws[f'E{row}'].value = deliverables
        if notes:
            ws[f'G{row}'].value = notes
        print(f'Milestones: "{name}" updated (row {row})')

    def add_velocity_row(
        self,
        session_id: str,      # e.g. 'S10'
        date_label: str,      # e.g. 'Mar 16'
        features_shipped: int,
        cumulative_total: int,
        tech_debt_items: int = 0,
        category_mix: str = '',
    ):
        """
        Append a row to the FEATURE VELOCITY table.
        Inserts after the last velocity Sx row.
        """
        ws = self.wb[SH_MILESTONES]
        # Velocity rows: find the block starting at 'FEATURE VELOCITY'
        vel_start = self._find_row_containing(ws, 'FEATURE VELOCITY')
        if vel_start is None:
            print('Milestones: FEATURE VELOCITY section not found')
            return
        # Find last Sx row after vel_start
        last_vel_row = None
        for i in range(vel_start + 1, ws.max_row + 1):
            val = ws.cell(row=i, column=1).value
            if val and isinstance(val, str) and val.startswith('S') and val[1:].isdigit():
                last_vel_row = i
        target_row = (last_vel_row + 1) if last_vel_row else vel_start + 2

        if ws.cell(row=target_row, column=1).value != session_id:
            self._set_row(ws, target_row, {
                'A': session_id, 'B': date_label, 'C': features_shipped,
                'D': cumulative_total, 'E': tech_debt_items, 'F': category_mix,
            })
            print(f'Milestones velocity: {session_id} added at row {target_row}')
        else:
            print(f'Milestones velocity: {session_id} already exists, skipping')

    def update_sprint_plan(
        self,
        session_id: str,       # e.g. 'S10'
        focus: str = None,
        planned_items: str = None,
        effort: str = None,
        risk: str = None,
        confidence: str = None,
        status_override: str = None,  # e.g. 'Done'
    ):
        """
        Update a sprint plan row in the SESSION / SPRINT PLAN table.
        Finds the Sx row in the sprint plan section (below 'SESSION / SPRINT PLAN').
        """
        ws = self.wb[SH_MILESTONES]
        sprint_start = self._find_row_containing(ws, 'SPRINT PLAN')
        if sprint_start is None:
            print('Milestones: SPRINT PLAN section not found')
            return
        # Find the Sx row in the sprint section
        for i in range(sprint_start + 1, ws.max_row + 1):
            if ws.cell(row=i, column=1).value == session_id:
                if focus:           ws[f'C{i}'].value = focus
                if planned_items:   ws[f'D{i}'].value = planned_items
                if effort:          ws[f'E{i}'].value = effort
                if risk:            ws[f'F{i}'].value = risk
                if confidence:      ws[f'G{i}'].value = confidence
                if status_override: ws[f'E{i}'].value = status_override
                print(f'Milestones sprint: {session_id} updated (row {i})')
                return
        print(f'Milestones sprint: {session_id} not found after row {sprint_start}')

    def add_sprint_plan_row(
        self,
        session_id: str,
        target_date: str,
        focus: str,
        planned_items: str,
        effort: str,
        risk: str,
        confidence: str,
    ):
        """Add a new sprint plan row (for future sessions not yet in the table)."""
        ws = self.wb[SH_MILESTONES]
        sprint_start = self._find_row_containing(ws, 'SPRINT PLAN')
        if sprint_start is None:
            return
        # Find last sprint Sx row
        last_sprint_row = None
        for i in range(sprint_start + 1, ws.max_row + 1):
            val = ws.cell(row=i, column=1).value
            if val and isinstance(val, str) and val.startswith('S') and val[1:].isdigit():
                last_sprint_row = i
        target_row = (last_sprint_row + 1) if last_sprint_row else sprint_start + 2
        if ws.cell(row=target_row, column=1).value != session_id:
            self._set_row(ws, target_row, {
                'A': session_id, 'B': target_date, 'C': focus,
                'D': planned_items, 'E': effort, 'F': risk, 'G': confidence,
            })
            print(f'Milestones sprint: {session_id} added at row {target_row}')

    # ── ARCHITECTURE ──────────────────────────────────────────────────────────

    def add_arch_session(
        self,
        session_id: str,      # e.g. 'S10'
        date: str,
        files_added: str,
        key_decisions: str,
        asyncstorage_keys: str = 'None added',
        notes: str = '',
    ):
        """Append a row to the SESSION LOG in the Architecture sheet."""
        ws = self.wb[SH_ARCH]
        # Find SESSION LOG section
        log_start = self._find_row_containing(ws, 'SESSION LOG')
        if log_start is None:
            print('Architecture: SESSION LOG section not found')
            return
        # Find last Sx row after log_start
        last_log_row = None
        for i in range(log_start + 1, ws.max_row + 1):
            val = ws.cell(row=i, column=1).value
            if val and isinstance(val, str) and (val.startswith('S') and (val[1:].isdigit() or '-' in val)):
                last_log_row = i
        target_row = (last_log_row + 1) if last_log_row else log_start + 2

        if ws.cell(row=target_row, column=1).value != session_id:
            self._set_row(ws, target_row, {
                'A': session_id, 'B': date, 'C': files_added,
                'D': key_decisions, 'E': asyncstorage_keys, 'F': notes,
            })
            print(f'Architecture: {session_id} session log added at row {target_row}')
        else:
            print(f'Architecture: {session_id} already exists, skipping')

    def update_arch_stack_row(self, layer_name: str, updates: dict):
        """
        Update a row in the TECHNOLOGY STACK table by layer name.
        updates = {'B': 'new tech', 'C': 'new version', ...}
        """
        ws = self.wb[SH_ARCH]
        row = self._find_row(ws, layer_name)
        if row is None:
            print(f'Architecture: stack row "{layer_name}" not found')
            return
        for col, val in updates.items():
            ws[f'{col}{row}'].value = val
        print(f'Architecture: stack row "{layer_name}" updated (row {row})')

    def update_arch_gotcha(self, col_a_substr: str, new_warning: str):
        """Update the 'Gotcha / Warning' column (D) of a design decision row."""
        ws = self.wb[SH_ARCH]
        row = self._find_row_containing(ws, col_a_substr)
        if row is None:
            print(f'Architecture: gotcha row containing "{col_a_substr}" not found')
            return
        ws[f'D{row}'].value = new_warning
        print(f'Architecture: gotcha updated (row {row})')

    # ── FEATURE REGISTRY ──────────────────────────────────────────────────────

    def add_feature(
        self,
        feature_id: int,
        name: str,
        category: str,      # e.g. 'Feature', 'UI', 'UX', 'Gamification', 'Bug Fix'
        session: str,       # e.g. 'S10'
        primary_files: str,
        description: str,
        xp_impact: str = 'No',
        status: str = '✅',
    ):
        """Append a feature to the Feature Registry. Skips if feature_id exists."""
        ws = self.wb[SH_FEATURES]
        if self._find_row(ws, feature_id) is not None:
            print(f'Feature Registry: #{feature_id} already exists, skipping')
            return
        r = self._last_data_row(ws) + 1
        self._set_row(ws, r, {
            'A': feature_id, 'B': name, 'C': category, 'D': session,
            'E': primary_files, 'F': description, 'G': xp_impact, 'H': status,
        })
        print(f'Feature Registry: #{feature_id} "{name}" added at row {r}')

    # ── CONVENIENCE: full session update ─────────────────────────────────────

    def end_of_session(
        self,
        session_n: int,
        date: str,
        # Dashboard
        deliverables: str,
        files_changed: str,
        session_notes: str,
        # Metrics
        total_features: int,
        open_items: int,
        tech_debt_count: int,
        # Architecture session log
        arch_files_added: str,
        arch_decisions: str,
        arch_asyncstorage: str = 'None added',
        arch_notes: str = '',
    ):
        """
        Convenience wrapper — call once at end of session.
        Updates: header, metrics, dashboard timeline, arch session log.
        You still call mark_backlog_done / add_backlog_item / add_feature separately.
        """
        sid = f'S{session_n}'
        prev_n = session_n - 1
        prev_features = total_features - 0  # caller provides total; prev derived elsewhere

        self.update_dashboard_header(session_n, date)
        self.update_dashboard_metrics(
            sessions=session_n,
            features=total_features,
            open_items=open_items,
            prev_sessions=prev_n,
            prev_features=total_features,   # will be overridden by caller if needed
            prev_open=open_items,
            tech_debt_count=tech_debt_count,
        )
        self.add_session_row(sid, date, '✅ Done', deliverables, files_changed, session_notes)
        self.update_backlog_header(session_n, date)
        self.add_arch_session(sid, date, arch_files_added, arch_decisions, arch_asyncstorage, arch_notes)
        print(f'End-of-session {sid} update complete.')


# ── CLI usage ─────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    """
    Template for Claude to fill in at end of each session.
    Edit SESSION, DATE and the calls below, then run: python pm_updater.py
    """
    pm = PMUpdater()

    SESSION = 12
    DATE    = '2026-03-16'

    # ── 1. Dashboard + headers ────────────────────────────────────────────
    pm.update_dashboard_header(SESSION, DATE)
    pm.update_dashboard_metrics(
        sessions=SESSION,
        features=35,        # +2: KlimaTicket presets overhaul + Delete All Trips
        open_items=5,       # unchanged: 2 feature + 3 pre-prod
        prev_sessions=11,
        prev_features=33,
        prev_open=5,
        tech_debt_count=0,
        preprod_count=3,
    )
    pm.add_session_row(
        f'S{SESSION}', DATE, '✅ Done',
        deliverables='KlimaTicket presets overhaul (6 nationwide + 20 regional, real 2026 prices). Delete All Trips with slide-to-confirm. Bug fixes: typeIcon crash, Expo Router route warning, RNGH-in-Modal, wrong AsyncStorage key.',
        files='profile.tsx, stats.tsx, app/(tabs)/user.tsx, app/(tabs)/_user_styles.tsx (renamed)',
        notes='3 compounding bugs in Delete All Trips: RNGH gestures dead in RN Modal (fixed with absolute overlay), runOnJS broken on web (fixed with .runOnJS(true)+setTimeout), wrong storage key @trips vs @travelapp_trips + initialTrips fallback (fixed with saveTrips([])).',
    )
    pm.update_backlog_header(SESSION, DATE)

    # ── 2. Backlog updates ────────────────────────────────────────────────
    # No pre-existing backlog items completed this session (all cleared in S11)
    # New bug fix backlog items added and immediately resolved:
    pm.add_backlog_item(
        32, 'Bug Fix', 'Fix typeIcon reference in stats.tsx',
        'stats.tsx still referenced typeIcon() after S11 refactor renamed it to transportIcon()',
        '🔴 Critical', 'XS (30m)', '✅ Done', f'S{SESSION}',
        'One leftover call at line 330; renamed to transportIcon(item.type)',
    )
    pm.add_backlog_item(
        33, 'Bug Fix', 'Rename user_styles.tsx to _user_styles.tsx',
        'Expo Router treated user_styles.tsx as a route — missing default export warning',
        '🟡 Medium', 'XS (15m)', '✅ Done', f'S{SESSION}',
        'Prefixed with _ (Expo Router ignores underscore files). Updated import in user.tsx.',
    )
    pm.add_backlog_item(
        34, 'Feature', 'KlimaTicket presets overhaul',
        'Replace placeholder presets with real 2026 Austrian KlimaTicket prices grouped by Nationwide/Regional',
        '🟠 High', 'S (2-4h)', '✅ Done', f'S{SESSION}',
        'TICKET_GROUPS: 6 nationwide + 20 regional variants. Grouped dropdown with section headers and description field.',
    )
    pm.add_backlog_item(
        35, 'Feature', 'Delete All Trips with slide-to-confirm',
        'Danger Zone in profile — slide gesture confirmation before wiping all trips and XP',
        '🟠 High', 'M (4-8h)', '✅ Done', f'S{SESSION}',
        'SlideToDelete: RNGH Gesture.Pan().runOnJS(true) + absolute overlay (NOT RN Modal). saveTrips([]) to clear. useFocusEffect reloads trips+XP on return.',
    )

    # ── 3. Feature Registry ───────────────────────────────────────────────
    pm.add_feature(
        34, 'KlimaTicket Presets Overhaul', 'Feature', f'S{SESSION}',
        'app/profile.tsx',
        '26 presets in TICKET_GROUPS (nationwide 6 + regional 20) with real 2026 prices, descriptions, period field for monthly tickets. Grouped dropdown UI.',
        xp_impact='No',
    )
    pm.add_feature(
        35, 'Delete All Trips', 'Feature', f'S{SESSION}',
        'app/profile.tsx, app/(tabs)/user.tsx',
        'Danger Zone section → slide-to-confirm overlay → clears trips + XP + mainQuestCelebrated. useFocusEffect reloads state on return.',
        xp_impact='Yes',
    )

    # ── 4. Milestones ─────────────────────────────────────────────────────
    pm.add_velocity_row(f'S{SESSION}', 'Mar 16', 2, 35, 0, 'Feature + Bug Fix')
    pm.update_sprint_plan(f'S{SESSION}', status_override='Done', confidence='Completed')

    # ── 5. Architecture ───────────────────────────────────────────────────
    pm.add_arch_session(
        f'S{SESSION}', DATE,
        files_added='None (profile.tsx, user.tsx, stats.tsx modified)',
        key_decisions='RNGH gestures do NOT work inside RN Modal on mobile — use absolute-positioned View overlay instead. saveTrips([]) to clear trips (removeItem would trigger initialTrips fallback). useFocusEffect reloads trips+XP on every screen focus.',
        asyncstorage_keys='None added',
        notes='3 compounding bugs resolved in Delete All Trips feature. STORAGE_KEY=@travelapp_trips (not @trips). loadTrips() returns initialTrips when key missing.',
    )

    # ── 6. Save ───────────────────────────────────────────────────────────
    pm.save()
