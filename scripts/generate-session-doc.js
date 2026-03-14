const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType,
} = require("docx");
const fs = require("fs");
const path = require("path");

const SESSION_DATE = "2026-03-13";
const SESSION_TITLE = "TravelApp – Session Progress Report";

// ── helpers ────────────────────────────────────────────────────────────────

const heading1 = (text) =>
  new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 120 } });

const heading2 = (text) =>
  new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 80 } });

const body = (text) =>
  new Paragraph({ children: [new TextRun({ text, size: 22 })], spacing: { after: 100 } });

const bold = (text) =>
  new Paragraph({ children: [new TextRun({ text, bold: true, size: 22 })], spacing: { after: 80 } });

const timestamp = (ts) =>
  new Paragraph({
    children: [new TextRun({ text: `🕐  ${ts}`, size: 20, color: "888888", italics: true })],
    spacing: { after: 120 },
  });

const codeBlock = (lines) =>
  new Paragraph({
    children: [new TextRun({ text: lines, font: "Courier New", size: 18, color: "1E293B" })],
    shading: { type: ShadingType.CLEAR, fill: "F1F5F9" },
    border: {
      top:    { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
      left:   { style: BorderStyle.SINGLE, size: 6, color: "6366F1" },
      right:  { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
    },
    indent: { left: 240 },
    spacing: { before: 60, after: 60 },
  });

const divider = () =>
  new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" } },
    spacing: { before: 200, after: 200 },
  });

// ── document content ───────────────────────────────────────────────────────

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Calibri", size: 22 },
      },
    },
  },
  sections: [{
    children: [

      // ── Cover ──────────────────────────────────────────────────────────
      new Paragraph({
        children: [new TextRun({ text: SESSION_TITLE, bold: true, size: 48, color: "4F46E5" })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 160 },
      }),
      new Paragraph({
        children: [new TextRun({ text: `Session date: ${SESSION_DATE}`, size: 22, color: "64748B" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "Scope: bug fixes, code quality improvements, SDK 54 upgrade", size: 22, color: "64748B", italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),

      divider(),

      // ── 1. levelSystem.ts ──────────────────────────────────────────────
      heading1("1. Fix levelSystem.ts"),
      timestamp("2026-03-13  ~start of session"),
      bold("Problem A – calculateLevel crashes on 0 XP"),
      body("Math.log(0) returns -Infinity, causing calculateLevel(0) to return -Infinity instead of 1. New users with no XP saw a broken level display."),
      codeBlock(
`// Before
return Math.floor(Math.log(totalXP / 100) / Math.log(1.5)) + 1;

// After
if (totalXP < 100) return 1;
return Math.max(1, Math.floor(Math.log(totalXP / 100) / Math.log(1.5)) + 1);`
      ),
      bold("Problem B – XP transport bonuses never applied"),
      body("The switch statement checked for 'bike', 'public transport', 'walk', 'car' – none of which the app ever uses. All trips fell through to the default (no bonus)."),
      codeBlock(
`// After – matches the actual transport types in the app
case 'tram':   baseXP *= 1.4; break;
case 'subway': baseXP *= 1.3; break;
case 'train':  baseXP *= 1.2; break;
case 'bus':    baseXP *= 1.1; break;`
      ),

      divider(),

      // ── 2. trip/[id].tsx ──────────────────────────────────────────────
      heading1("2. Rewrite app/trip/[id].tsx"),
      timestamp("2026-03-13"),
      body("The trip detail screen was entirely wrong – it contained hardcoded holiday data (Paris, Tokyo, Bali) with no connection to AsyncStorage. Tapping any trip card always resulted in 'Trip not found'."),
      body("The screen was rewritten to load the real trip via getTripById() from the shared tripStorage service, then display origin/destination, date & time, transport type, distance, equivalent cost, and optional description."),
      codeBlock(
`// Now loads real data
const { id } = useLocalSearchParams<{ id: string }>();
const [trip, setTrip] = useState<Trip | null>(null);

useEffect(() => {
  getTripById(id).then(setTrip).finally(() => setLoading(false));
}, [id]);`
      ),

      divider(),

      // ── 3. user.tsx ───────────────────────────────────────────────────
      heading1("3. Fix app/(tabs)/user.tsx"),
      timestamp("2026-03-13"),
      bold("Problem A – Duplicated service code"),
      body("user.tsx contained its own copies of loadTrips, saveTrips, initialTrips, and a local Trip interface – all of which already existed in tripStorage.ts and types/trip.ts. These were removed and replaced with imports."),
      codeBlock(
`// Removed ~80 lines of duplicated code, replaced with:
import { Trip } from "@/app/types/trip";
import { loadTrips, saveTrips } from "@/app/services/tripStorage";`
      ),
      bold("Problem B – Broken navigation route"),
      body("handleTripPress navigated to /(tabs)/trip/\${id} but the file lives at app/trip/[id].tsx. The correct route is /trip/\${id}."),
      codeBlock(
`// Before
router.push(\`/(tabs)/trip/\${tripId}\` as any);

// After
router.push(\`/trip/\${tripId}\` as any);`
      ),
      bold("Problem C – Wrong klimaTicketCost value"),
      body("The prop was passed as 1090 but the KlimaTicket Ö Classic costs €1,297.80. Corrected to match the official price."),

      divider(),

      // ── 4. QuickAddTripModal.tsx ──────────────────────────────────────
      heading1("4. Fix QuickAddTripModal.tsx"),
      timestamp("2026-03-13"),
      bold("Problem A – Date picker showed future dates"),
      body("The date picker generated dates for the next 7 days. Since users are logging trips they already took, it now generates the past 7 days (most recent first)."),
      codeBlock(
`// Before: today.getDate() + i  (future)
// After:  today.getDate() - i  (past)`
      ),
      bold("Problem B – Dead inline <DateTimePicker>"),
      body("A redundant inline DateTimePicker component (from @react-native-community/datetimepicker) was still rendered alongside the custom date picker modal, causing a TypeScript error and conflicting UX. It was removed along with the unused Platform and DateTimePicker imports."),
      bold("Problem C – Ambiguous cost field label"),
      body("The placeholder 'Cost (€)' was misleading since KlimaTicket users pay €0 per trip. Changed to 'Equivalent ticket price (€)' to clarify the intent."),

      divider(),

      // ── 5. FinancialOverview.tsx ──────────────────────────────────────
      heading1("5. Fix FinancialOverview.tsx"),
      timestamp("2026-03-13"),
      bold("Problem A – klimaTicketCost prop was dead code"),
      body("The component accepted a klimaTicketCost prop but internally used a hardcoded KLIMATICKET_PRICE = 1297.80 constant instead. The constant was removed and the prop is now used throughout."),
      bold("Problem B – remainingToBreakEven went negative"),
      body("Once enough trips were logged to exceed the ticket price, the value went negative. Clamped to Math.max(0, ...)."),
      bold("Problem C – Broken info text"),
      body("The footer text read 'Based on trips in the last {totalDistance} km' – distance is not a time frame. Fixed to 'Based on X trips covering Y km', and when break-even is reached it now shows 'KlimaTicket has paid off!'"),
      codeBlock(
`// Before (broken)
"Based on trips in the last {totalDistance} km"

// After
{tripsNeeded > 0
  ? \`\${tripsNeeded} more trips needed to break even\`
  : 'KlimaTicket has paid off!'}
// subtitle: "Based on {totalTrips} trips covering {totalDistance} km"`
      ),
      bold("Problem D – Confusing 'Money Saved' label"),
      body("Renamed to 'Ticket Value Used' / 'Equivalent Ticket Value' to accurately reflect that these are equivalent prices, not actual cash savings."),

      divider(),

      // ── 6. Expo SDK 54 Upgrade ─────────────────────────────────────────
      heading1("6. Expo SDK 54 Upgrade"),
      timestamp("2026-03-13  ~second half of session"),
      body("Upgraded the project from Expo SDK 52 (React Native 0.76, React 18, expo-router v4) to SDK 54 (React Native 0.81, React 19, expo-router v6). This is a major version jump spanning two SDK releases."),

      bold("Step 1 – Install SDK 54 core"),
      codeBlock(`npm install expo@^54.0.0`),

      bold("Step 2 – Update all managed packages"),
      body("expo install --fix resolves all Expo-managed dependencies to their SDK 54 compatible versions. npm's strict peer resolution required --legacy-peer-deps due to transitive React 19 conflicts."),
      codeBlock(`npx expo install --fix -- --legacy-peer-deps`),
      body("31 packages updated. Key version changes:"),
      codeBlock(
`react 18.3.1          → 19.1.0
react-native 0.76.3   → 0.81.5
expo-router 4.0.9     → 6.0.23
react-native-reanimated 3.16 → 4.1.1
react-native-safe-area-context 4.12 → 5.6.0
react-native-screens 4.1 → 4.16`
      ),

      bold("Step 3 – Remove unused package"),
      body("@react-native-community/datetimepicker was still in package.json but had already been removed from the codebase (replaced with a custom modal picker). Removed from dependencies to avoid the SDK 54 plugin requirement."),
      codeBlock(`// Removed from package.json dependencies:
"@react-native-community/datetimepicker": "8.4.4"`),

      bold("Step 4 – Add required Expo plugins to app.config.ts"),
      body("expo-router v6, expo-build-properties, expo-font, and expo-web-browser now require explicit plugin registration in the Expo config. expo install --fix reported these as missing."),
      codeBlock(
`// app.config.ts – plugins array
plugins: [
  "expo-secure-store",
  "expo-build-properties",  // new
  "expo-font",              // new
  "expo-router",            // new
  "expo-web-browser",       // new
]`
      ),

      bold("Step 5 – Update devDependencies"),
      codeBlock(
`jest-expo         52.0.2  → 54.0.17
@types/react      18.3.12 → 19.1.10
react-test-renderer 18.3.1 → 19.1.0
typescript        5.3.3   → 5.9.2`
      ),

      divider(),

      // ── 7. TypeScript fixes post-upgrade ──────────────────────────────
      heading1("7. TypeScript Fixes (post-SDK upgrade)"),
      timestamp("2026-03-13"),
      body("Running npx tsc --noEmit after the upgrade revealed 3 type errors introduced by the new package versions."),

      bold("Fix A – Wrong import path in tripStorage.ts"),
      body("The service file imported from '@/types/trip' (non-existent alias path) instead of '@/app/types/trip'. This was a pre-existing bug that TypeScript 5.9 caught more strictly."),
      codeBlock(
`// Before
import { Trip } from "@/types/trip";

// After
import { Trip } from "@/app/types/trip";`
      ),

      bold("Fix B – ExternalLink.tsx href type too loose for expo-router v6"),
      body("expo-router v6 introduced stricter typed routes. The href prop typed as 'string' no longer satisfies Link's expected type. Changed to a template literal type that matches external URLs."),
      codeBlock(
`// Before
type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: string };

// After
type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: \`\${string}://\${string}\` };`
      ),

      bold("Fix C – IconSymbol.tsx ViewStyle vs TextStyle mismatch"),
      body("React Native 0.81 tightened the 'userSelect' property type in TextStyle vs ViewStyle. MaterialIcons expects StyleProp<TextStyle> for its style prop, but the component declared StyleProp<ViewStyle>. Updated the import and prop type."),
      codeBlock(
`// Before
import { OpaqueColorValue, StyleProp, ViewStyle } from 'react-native';
style?: StyleProp<ViewStyle>;

// After
import { OpaqueColorValue, StyleProp, TextStyle } from 'react-native';
style?: StyleProp<TextStyle>;`
      ),
      body("After all three fixes: npx tsc --noEmit exits with 0 errors."),

      divider(),

      // ── 8. Runtime fixes ───────────────────────────────────────────────
      heading1("8. Runtime Fixes – Getting the App Running"),
      timestamp("2026-03-13  ~end of session"),

      bold("Fix A – Asset paths in app.config.ts"),
      body("All four asset references pointed to ./assets/*.png but the actual files live under ./assets/images/. Metro threw a 'file not found' error on startup. Fixed every path."),
      codeBlock(
`// Before
icon: './assets/icon.png',
splash: { image: './assets/splash.png' },
android: { adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png' } },
web: { favicon: './assets/favicon.png' },

// After
icon: './assets/images/icon.png',
splash: { image: './assets/images/splash-icon.png' },
android: { adaptiveIcon: { foregroundImage: './assets/images/adaptive-icon.png' } },
web: { favicon: './assets/images/favicon.png' },`
      ),

      bold("Fix B – Install react-native-worklets peer dependency"),
      body("react-native-reanimated v4 requires react-native-worklets as an explicit peer dependency. Without it the bundler threw a missing-module error before rendering any screen."),
      codeBlock(`npx expo install react-native-worklets`),

      bold("Fix C – Supabase ws/stream Node.js built-in error"),
      body("Supabase Realtime client pulls in the Node.js 'ws' package, which in turn requires the 'stream' built-in. React Native has no 'stream' module, causing a bundle-time error. The fix shims 'ws' to an empty module in Metro so Supabase falls back to the global native WebSocket."),
      codeBlock(
`// metro.config.js
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "ws") return { type: "empty" };
  if (originalResolveRequest) return originalResolveRequest(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};`
      ),

      bold("Fix D – Add react-native-url-polyfill for Supabase"),
      body("Supabase uses the URL constructor internally. React Native does not fully implement the WHATWG URL API, causing silent failures. The polyfill is imported as the very first line of the root layout so it patches the global before anything else loads."),
      codeBlock(
`// app/_layout.tsx – first line
import "react-native-url-polyfill/auto";`
      ),

      divider(),

      // ── Milestone ──────────────────────────────────────────────────────
      new Paragraph({
        children: [
          new TextRun({ text: "🚀  App is running on Expo!", bold: true, size: 40, color: "16A34A" }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 300, after: 100 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "All bugs fixed · SDK 54 · 0 TypeScript errors · Bundler clean · Live on Expo Go", size: 22, color: "64748B", italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
      }),

      divider(),

      // ── Summary ───────────────────────────────────────────────────────
      heading1("Session Summary"),
      body("This session covered two areas: (1) fixing pre-existing bugs and code quality issues, and (2) upgrading the project from Expo SDK 52 to SDK 54."),
      new Paragraph({ spacing: { after: 100 } }),

      bold("Part 1 – Bug fixes (5 files)"),
      new Table({
        columnWidths: [2700, 4950, 1350],
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "File", bold: true })] })], shading: { fill: "EEF2FF" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Changes", bold: true })] })], shading: { fill: "EEF2FF" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Priority", bold: true })] })], shading: { fill: "EEF2FF" } }),
            ],
          }),
          new TableRow({ children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "utils/levelSystem.ts" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Guard 0-XP crash; fix transport type bonus matching" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "High" })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "app/trip/[id].tsx" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Full rewrite – now loads real trip data from storage" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "High" })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "app/(tabs)/user.tsx" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Remove duplicated code; fix nav route; fix ticket cost value" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "High" })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "components/ui/QuickAddTripModal.tsx" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Past dates in picker; remove dead DateTimePicker; clarify cost label" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Medium" })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "components/ui/FinancialOverview.tsx" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Use prop instead of hardcoded price; clamp negative value; fix info text; fix labels" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Medium" })] })] }),
          ]}),
        ],
      }),

      new Paragraph({ spacing: { after: 200 } }),
      bold("Part 2 – SDK 54 upgrade (8 files / config)"),
      new Table({
        columnWidths: [2700, 6300],
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "File / Action", bold: true })] })], shading: { fill: "EEF2FF" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Change", bold: true })] })], shading: { fill: "EEF2FF" } }),
            ],
          }),
          new TableRow({ children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "package.json" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "expo ^54, react 19.1.0, react-native 0.81.5, 31 packages updated, datetimepicker removed, devDeps updated" })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "app.config.ts" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Added 4 required plugins: expo-build-properties, expo-font, expo-router, expo-web-browser" })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "app/services/tripStorage.ts" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Fixed wrong @/types/trip import path to @/app/types/trip" })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "components/ExternalLink.tsx" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Updated href type for expo-router v6 typed routes" })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "components/ui/IconSymbol.tsx" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Changed StyleProp<ViewStyle> to StyleProp<TextStyle> for RN 0.81 compatibility" })] })] }),
          ]}),
        ],
      }),

      new Paragraph({ spacing: { after: 200 } }),
      bold("Part 3 – Runtime fixes (4 changes)"),
      new Table({
        columnWidths: [2700, 6300],
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "File / Action", bold: true })] })], shading: { fill: "EEF2FF" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Change", bold: true })] })], shading: { fill: "EEF2FF" } }),
            ],
          }),
          new TableRow({ children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "app.config.ts" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Fixed all 4 asset paths from ./assets/ to ./assets/images/" })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "metro.config.js" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Added resolveRequest shim to map ws to empty module (Supabase fix)" })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "app/_layout.tsx" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Added react-native-url-polyfill/auto import as first line" })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "package.json" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Installed react-native-worklets (reanimated v4 peer dependency)" })] })] }),
          ]}),
        ],
      }),

      new Paragraph({ spacing: { after: 200 } }),
      body("Part 1: 5 files changed · ~150 lines removed (duplicated code) · 0 new features"),
      body("Part 2: SDK 52 → 54 · React 18 → 19 · RN 0.76 → 0.81 · expo-router v4 → v6 · 0 TypeScript errors"),
      body("Part 3: 4 runtime fixes · App live on Expo Go"),
      new Paragraph({
        children: [new TextRun({ text: `Generated ${new Date().toISOString()}`, size: 18, color: "94A3B8", italics: true })],
        spacing: { before: 300 },
      }),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  const outPath = path.join(__dirname, "..", "docs", `session-${SESSION_DATE}.docx`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buffer);
  console.log(`✓ Written to ${outPath}`);
});
