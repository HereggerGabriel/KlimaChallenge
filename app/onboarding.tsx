import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ImageBackground,
  ViewToken,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Palette } from "@/constants/Colors";

// ─── Slides config ───────────────────────────────────────────────────────────
// Drop your design images into assets/images/ and uncomment the require() lines.
// Until then each slide uses a gradient background.

type Slide = {
  key: string;
  image: number | null;
  fallbackColors: [string, string];
  title: string;
  subtitle: string;
};

const SLIDES: Slide[] = [
  {
    key: "roi",
    image: require("@/assets/images/onboard1.png"),
    fallbackColors: [Palette.blue.mid, Palette.blue.dark],
    title: "Measure Your ROI",
    subtitle:
      "See your Return on Investment build in real time. Every trip brings your KlimaTicket closer to paying off.",
  },
  {
    key: "challenge",
    image: require("@/assets/images/onboard2.png"),
    fallbackColors: [Palette.green.dark, Palette.blue.dark],
    title: "Accept the Challenge",
    subtitle:
      "Track savings, hit milestones — 50 trips, 3 regions, 1000 km. Earn badges. Beat break-even.",
  },
  {
    key: "start",
    image: require("@/assets/images/loginbg.png"),
    fallbackColors: [Palette.green.mid, Palette.blue.dark],
    title: "Your Journey Starts Here",
    subtitle:
      "Log your first trip and watch the KlimaChallenge begin. Austria is your playground.",
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<Slide>>(null);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const isLast = activeIndex === SLIDES.length - 1;

  const handleFinish = () => {
    router.replace("/login");
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Skip */}
      {!isLast && (
        <TouchableOpacity
          style={[styles.skipButton, { top: insets.top + 16 }]}
          onPress={handleFinish}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slide pager */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        style={styles.flatList}
        renderItem={({ item }) =>
          item.image ? (
            <ImageBackground
              source={item.image}
              style={{ width, height }}
              resizeMode="contain"
            >
              <LinearGradient
                colors={["transparent", "rgba(0,20,40,0.6)", Palette.blue.dark]}
                locations={[0.25, 0.6, 1]}
                style={[styles.gradient, { height: height * 0.58 }]}
              />
            </ImageBackground>
          ) : (
            <LinearGradient
              colors={item.fallbackColors}
              style={{ width, height }}
              start={{ x: 0.3, y: 0 }}
              end={{ x: 0.7, y: 1 }}
            >
              <View style={styles.placeholderIconRow}>
                <Text style={styles.placeholderIcon}>🗺️</Text>
              </View>
            </LinearGradient>
          )
        }
      />

      {/* Bottom overlay card */}
      <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.title}>{SLIDES[activeIndex].title}</Text>
        <Text style={styles.subtitle}>{SLIDES[activeIndex].subtitle}</Text>

        {/* Dot indicators — tappable for navigation */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => flatListRef.current?.scrollToIndex({ index: i, animated: true })}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            >
              <View
                style={[
                  styles.dot,
                  i === activeIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        {isLast && (
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleFinish}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>Get Started →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.blue.dark,
  },
  skipButton: {
    position: "absolute",
    right: 22,
    zIndex: 20,
  },
  skipText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 15,
    fontWeight: "500",
  },
  flatList: {
    flex: 1,
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  placeholderIconRow: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderIcon: {
    fontSize: 96,
    opacity: 0.4,
  },
  bottomCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    paddingTop: 16,
    alignItems: "center",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 28,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  dotActive: {
    width: 26,
    backgroundColor: Palette.green.mid,
  },
  dotInactive: {
    width: 7,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  title: {
    color: "#ffffff",
    fontSize: 27,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  subtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
    marginBottom: 30,
  },
  ctaButton: {
    backgroundColor: Palette.green.mid,
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  ctaText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
