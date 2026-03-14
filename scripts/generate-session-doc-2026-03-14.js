const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType,
} = require("docx");
const fs = require("fs");
const path = require("path");

const SESSION_DATE = "2026-03-14";
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

const bullet = (text) =>
  new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    bullet: { level: 0 },
    spacing: { after: 60 },
  });

const codeBlock = (lines) =>
  new Paragraph({
    children: [new TextRun({ text: lines, font: "Courier New", size: 18, color: "1E293B" })],
    shading: { type: ShadingType.CLEAR, fill: "F1F5F9" },
    border: {
      top:    { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
      left:   { style: BorderStyle.SINGLE, size: 6, color: "3FB28F" },
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

const tableRow = (col1, col2, col3) => new TableRow({
  children: [
    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: col1, size: 20 })] })] }),
    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: col2, size: 20 })] })] }),
    ...(col3 !== undefined ? [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: col3, size: 20 })] })] })] : []),
  ],
});

const tableHeader = (...cols) => new TableRow({
  tableHeader: true,
  children: cols.map(c =>
    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: c, bold: true, size: 20 })] })], shading: { fill: "ECFDF5" } })
  ),
});

// ── document ──────────────────────────────────────────────────────────────

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Calibri", size: 22 } } },
  },
  sections: [{
    children: [

      // ── Cover ──────────────────────────────────────────────────────────
      new Paragraph({
        children: [new TextRun({ text: SESSION_TITLE, bold: true, size: 48, color: "0B6C8A" })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 160 },
      }),
      new Paragraph({
        children: [new TextRun({ text: `Session date: ${SESSION_DATE}`, size: 22, color: "64748B" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "Scope: First Run Experience (FRE) — Splash · Onboarding · Login redesign · App architecture refactor", size: 22, color: "64748B", italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),

      divider(),

      // ── PART 0: Previous session context ──────────────────────────────
      heading1("0. Context from Previous Session (2026-03-13)"),
      body("The following is a summary of the project state and work completed in the prior session, as loaded from persistent memory at the start of this session."),

      heading2("0.1  Project Overview"),
      body("TravelApp is a React Native / Expo app for tracking public transport trips (bus, train, tram, subway) in Austria. The core value proposition is helping users track trip costs against their KlimaTicket Ö annual pass (€1,297.80) to see when it breaks even. Users also earn XP and level up as they log more trips."),

      heading2("0.2  Tech Stack"),
      new Table({
        columnWidths: [2200, 6800],
        rows: [
          tableHeader("Layer", "Technology"),
          tableRow("Framework", "React Native + Expo SDK 54"),
          tableRow("Routing", "Expo Router v6 (file-based)"),
          tableRow("Language", "TypeScript"),
          tableRow("Local storage", "AsyncStorage (@react-native-async-storage)"),
          tableRow("Secure storage", "expo-secure-store (auth tokens)"),
          tableRow("Auth", "Supabase (wired up, dummy users used in dev)"),
          tableRow("Gestures", "react-native-gesture-handler ~2.28.0"),
          tableRow("Animation", "react-native-reanimated ~4.1.1"),
          tableRow("Styling", "NativeWind (CSS-in-JS) + StyleSheet.create"),
        ],
      }),

      new Paragraph({ spacing: { after: 200 } }),
      heading2("0.3  Key Files"),
      new Table({
        columnWidths: [3200, 5800],
        rows: [
          tableHeader("File", "Purpose"),
          tableRow("app/_layout.tsx", "Root layout — wraps in GestureHandlerRootView"),
          tableRow("app/(tabs)/_layout.tsx", "Tab bar (Home, My Trips)"),
          tableRow("app/(tabs)/user.tsx", "Main trips screen with Favorites hold-to-add"),
          tableRow("app/(tabs)/user_styles.tsx", "Styles extracted from user.tsx"),
          tableRow("app/trip/[id].tsx", "Trip detail screen"),
          tableRow("app/new-trip.tsx", "New trip creation screen"),
          tableRow("services/tripStorage.ts", "AsyncStorage CRUD for trips"),
          tableRow("types/trip.ts", "Trip interface"),
          tableRow("components/ui/FinancialOverview.tsx", "Cost vs KlimaTicket savings widget (SVG donut)"),
          tableRow("components/ui/UserLevelCard.tsx", "XP/level display card"),
          tableRow("components/ui/QuickAddTripModal.tsx", "Quick add trip modal"),
          tableRow("utils/levelSystem.ts", "XP/level calculation logic"),
          tableRow("constants/Colors.ts", "Palette (9-color system) + legacy Colors"),
        ],
      }),

      new Paragraph({ spacing: { after: 200 } }),
      heading2("0.4  Color Palette"),
      body("All UI uses a custom 9-color Palette (3 hues × 3 shades) defined in constants/Colors.ts. Hardcoded hex values are not used."),
      codeBlock(
`export const Palette = {
  blue:  { light: '#84c5dd', mid: '#0b6c8a', dark: '#00334f' },
  green: { light: '#9dcda2', mid: '#3fb28f', dark: '#418880' },
  red:   { light: '#eb6c4c', mid: '#e95b20', dark: '#e63c35' },
};`
      ),

      heading2("0.5  Work Completed in Session 2026-03-13"),
      bullet("levelSystem.ts — fixed 0-XP crash (Math.log guard) and broken transport type bonus matching"),
      bullet("app/trip/[id].tsx — full rewrite; was showing hardcoded holiday data (Paris/Tokyo/Bali), now loads real trips from AsyncStorage"),
      bullet("app/(tabs)/user.tsx — removed ~80 lines of duplicated service code; fixed navigation route; corrected KlimaTicket cost value"),
      bullet("QuickAddTripModal.tsx — fixed date picker showing future dates; removed dead DateTimePicker; clarified cost label"),
      bullet("FinancialOverview.tsx — used prop instead of hardcoded price; clamped negative break-even value; fixed broken info text"),
      bullet("Expo SDK 52 → 54 upgrade (React 18→19, RN 0.76→0.81, expo-router v4→v6)"),
      bullet("TypeScript fixes post-upgrade: import paths, href type, ViewStyle vs TextStyle"),
      bullet("Runtime fixes: asset paths, react-native-worklets, Supabase ws shim in metro.config.js, url-polyfill"),

      heading2("0.6  Favorites Feature (background)"),
      body("The user screen includes a Favorites section showing the top 4 most-used trips. Hold-to-add uses GestureDetector + LongPress (1000ms) from RNGH with a Reanimated fill animation. This approach was chosen after multiple failed attempts with TouchableOpacity, Pressable, onTouchStart, PanResponder, and scrollEnabled toggling — all of which were intercepted by ScrollView's native gesture recognizer. RNGH operates at the native gesture layer and negotiates correctly."),

      divider(),

      // ── PART 1: Routing architecture decision ─────────────────────────
      heading1("1. Architecture Decision — Login Outside Tabs"),
      body("The original app had the login form at app/(tabs)/index.tsx — inside the tab navigator. This caused two problems: (1) login is pre-authentication content and should not be a tab, and (2) adding a root app/index.tsx for the splash screen would create a routing conflict since (tabs) groups strip their name from the URL, making both files resolve to '/'."),
      body("Three options were considered:"),
      bullet("Option A — Rename (tabs)/index.tsx to (tabs)/home.tsx (minimal change)"),
      bullet("Option B — Handle FRE logic in _layout.tsx (no extra file)"),
      bullet("Option C — Move login out of tabs entirely into app/login.tsx (most architecturally correct)"),
      body("Option C was chosen. The tab navigator now only contains authenticated screens. The pre-auth flow (splash → onboarding → login) lives entirely outside the tab group."),

      codeBlock(
`New route structure:
  /              → app/index.tsx        (splash)
  /onboarding    → app/onboarding.tsx   (FRE slides)
  /login         → app/login.tsx        (login — outside tabs)
  /(tabs)        → app/(tabs)/          (authenticated only)
  /(tabs)/user   → app/(tabs)/user.tsx  (my trips)`
      ),

      divider(),

      // ── PART 2: Splash screen ─────────────────────────────────────────
      heading1("2. app/index.tsx — Animated Splash Screen"),
      body("A new root-level screen replaces the OS splash image with an in-app animated branded screen. This allows async logic (auth check) to run while the user sees smooth branding rather than a white flash."),

      bold("Visual design"),
      bullet("Background: Palette.blue.dark (#00334f) — dark navy"),
      bullet("Center: glowing circle (Palette.green.dark fill, Palette.green.mid border + shadow)"),
      bullet("Inside circle: 🚊 tram emoji at 48px (temporary placeholder)"),
      bullet("Below: 'TravelApp' in white bold 30px"),
      bullet("Subtitle: 'Track. Save. Beat Break-Even.' in Palette.blue.light"),
      bullet("Bottom badge: 'KLIMACHALLENGE' in Palette.green.mid, uppercase, spaced"),

      bold("Animation (Reanimated)"),
      codeBlock(
`logoScale:   0.72 → 1.0   (withTiming, 650ms)
logoOpacity: 0   → 1.0   (withTiming, 650ms)
glowOpacity: 0   → 1.0   (withDelay 200ms + withTiming 700ms)
textOpacity: 0   → 1.0   (withDelay 450ms + withTiming 550ms)`
      ),

      bold("Routing logic"),
      body("After 2000ms the screen reads isAuthenticated from AsyncStorage. If true → /(tabs). If false → /onboarding. This means the onboarding always shows when the user is not logged in — there is no 'hasSeenOnboarding' flag."),
      codeBlock(
`async function getInitialRoute(): Promise<"/onboarding" | "/(tabs)"> {
  const auth = await AsyncStorage.getItem("isAuthenticated");
  return auth === "true" ? "/(tabs)" : "/onboarding";
}`
      ),

      divider(),

      // ── PART 3: Onboarding ─────────────────────────────────────────────
      heading1("3. app/onboarding.tsx — 3-Slide Onboarding"),
      body("A full-screen horizontal pager showing three illustrated slides before the user reaches the login screen. Uses a FlatList with pagingEnabled for native-feel swiping."),

      bold("Slide content and image mapping"),
      new Table({
        columnWidths: [1400, 2500, 2200, 2900],
        rows: [
          tableHeader("Slide", "Image file", "Title", "Subtitle summary"),
          tableRow("1", "onboard1.png", "Measure Your ROI", "KlimaTicket ROI building trip by trip"),
          tableRow("2", "onboard2.png", "Accept the Challenge", "50 trips, 3 regions, 1000 km milestones"),
          tableRow("3", "loginbg.png*", "Your Journey Starts Here", "Log first trip, start the challenge"),
        ],
      }),
      body("* loginbg.png (the plain Austrian map) is shared between the third onboarding slide and the login screen background."),

      bold("Image fallback system"),
      body("Each slide has an image field (require()) and a fallbackColors pair. If the image file is not present at bundle time the bundler will fail — the fallback is for development reference only. Once image files are placed in assets/images/ the require() calls are live."),

      bold("Navigation controls"),
      bullet("Dot indicators: active dot is 26px wide in Palette.green.mid; inactive dots are 7px in white/30%"),
      bullet("Skip button (top right): visible on slides 1 and 2, hidden on slide 3"),
      bullet("Next button: full-width, Palette.green.mid, 14px border radius"),
      bullet("Get Started button (slide 3): Palette.green.dark with Palette.green.mid border"),
      bullet("Both Skip and Get Started call router.replace('/login') — no history entry"),

      bold("Viewability tracking"),
      body("Active slide index is tracked via onViewableItemsChanged with viewAreaCoveragePercentThreshold: 50, wrapped in useRef to avoid the FlatList warning about changing callbacks."),

      divider(),

      // ── PART 4: Login screen ──────────────────────────────────────────
      heading1("4. app/login.tsx — Standalone Login Screen"),
      body("The login screen was moved out of the tabs group into app/login.tsx. It uses the plain Austrian map (loginbg.png) as a full-bleed ImageBackground with a dark gradient overlay."),

      bold("Layout"),
      bullet("ImageBackground: loginbg.png, resizeMode='cover', full screen"),
      bullet("Overlay: LinearGradient — rgba(0,20,40,0.35) → rgba(0,20,40,0.72) → Palette.blue.dark"),
      bullet("Upper third: logo circle (72px, Palette.green.dark), 'TravelApp' title, 'KLIMACHALLENGE' badge"),
      bullet("Lower area: <LoginForm /> with paddingHorizontal: 28"),

      divider(),

      // ── PART 5: LoginForm redesign ────────────────────────────────────
      heading1("5. components/ui/LoginForm.tsx — Full Visual Redesign"),
      body("The login form was completely restyled. NativeWind class-based styling was replaced with StyleSheet.create for full control over the dark-overlay appearance."),

      bold("Input design"),
      bullet("Each input is an independent box with its own label above (EMAIL / PASSWORD in small uppercase)"),
      bullet("Box style: rgba(255,255,255,0.10) background, borderRadius 14, rgba(255,255,255,0.18) border"),
      bullet("Error state: border turns Palette.red.light"),
      bullet("Text: white, 16px; placeholder: rgba(255,255,255,0.35)"),

      bold("Link row"),
      body("'Forgot password?' and 'Sign up' sit in a flex-row justified space-between row between the inputs and the login button. Both styled in Palette.blue.light at 13px."),

      bold("Login button"),
      bullet("Small pill: paddingHorizontal 52, paddingVertical 14, borderRadius 30, minWidth 160"),
      bullet("Background: Palette.green.mid with green shadow glow (shadowOpacity 0.4, shadowRadius 12)"),
      bullet("Centered with alignItems: 'center' on a wrapper View"),
      bullet("Disabled state: opacity 0.5"),

      codeBlock(
`loginButton: {
  backgroundColor: Palette.green.mid,
  paddingVertical: 14,
  paddingHorizontal: 52,
  borderRadius: 30,
  minWidth: 160,
  shadowColor: Palette.green.mid,
  shadowOpacity: 0.4,
  shadowRadius: 12,
}`
      ),

      divider(),

      // ── PART 6: Home tab dashboard ────────────────────────────────────
      heading1("6. app/(tabs)/index.tsx — Home Dashboard Tab"),
      body("With the login form removed from the tabs group, the Home tab was rebuilt as a real post-login dashboard screen."),

      bold("Content"),
      bullet("Greeting row: 'Good day 👋' + 'Here's your KlimaChallenge'"),
      bullet("UserLevelCard — loads XP from AsyncStorage key 'userXP'"),
      bullet("FinancialOverview — loads all trips, computes totals, passes to component"),
      bullet("Quick action cards: 'My Trips' (→ /(tabs)/user) and 'Log Trip' (→ /new-trip)"),

      bold("Data loading"),
      codeBlock(
`useEffect(() => {
  loadTrips().then(setTrips);
  AsyncStorage.getItem("userXP").then((val) =>
    setXP(val ? parseInt(val, 10) : 0)
  );
}, []);`
      ),

      divider(),

      // ── Summary table ─────────────────────────────────────────────────
      heading1("Session Summary — Files Changed"),
      new Table({
        columnWidths: [3000, 2500, 3500],
        rows: [
          tableHeader("File", "Status", "Description"),
          tableRow("app/index.tsx", "NEW", "Animated splash + auth-based routing"),
          tableRow("app/onboarding.tsx", "NEW", "3-slide FRE pager with image backgrounds"),
          tableRow("app/login.tsx", "NEW", "Standalone login screen with map background"),
          tableRow("app/(tabs)/index.tsx", "REWRITTEN", "Home dashboard (level + financial + quick actions)"),
          tableRow("components/ui/LoginForm.tsx", "REDESIGNED", "Separate input boxes, small centered CTA, Palette colors"),
        ],
      }),

      new Paragraph({ spacing: { after: 200 } }),

      new Paragraph({
        children: [new TextRun({ text: "Assets pending from designer", bold: true, size: 22, color: "E95B20" })],
        spacing: { after: 80 },
      }),
      new Table({
        columnWidths: [2800, 4400, 1800],
        rows: [
          tableHeader("File", "Usage", "Status"),
          tableRow("assets/images/onboard1.png", "Onboarding slide 1 — ROI annotated map", "Pending"),
          tableRow("assets/images/onboard2.png", "Onboarding slide 2 — Full KlimaTicket cards map", "Pending"),
          tableRow("assets/images/loginbg.png", "Onboarding slide 3 + Login screen background", "Pending"),
        ],
      }),

      new Paragraph({ spacing: { after: 300 } }),

      new Paragraph({
        children: [new TextRun({ text: "🎯  FRE Complete", bold: true, size: 40, color: "3FB28F" })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "Splash · Onboarding (3 slides) · Login redesign · Auth-based routing · Home dashboard", size: 22, color: "64748B", italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
      }),

      divider(),

      new Paragraph({
        children: [new TextRun({ text: `Generated ${new Date().toISOString()}`, size: 18, color: "94A3B8", italics: true })],
        spacing: { before: 100 },
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
