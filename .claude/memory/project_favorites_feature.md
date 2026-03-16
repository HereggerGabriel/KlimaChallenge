---
name: TravelApp Favorites feature
description: Hold-to-add favorites cards on the user/trips screen
type: project
---

The user screen has a "Favorites" section showing top 4 most-used trips (by frequency).

**Hold-to-add interaction:**
- Uses `GestureDetector` + `Gesture.LongPress().minDuration(1000).runOnJS(true)` from react-native-gesture-handler
- Fill animation: Reanimated `useSharedValue` + `withTiming` fills card from bottom to top over 1s
- On completion: flash overlay plays (`withSequence` opacity 0→1→0), then `onAdd()` is called
- On cancel (release early): `onFinalize` resets `progress.value = 0`
- `GestureHandlerRootView` is in `app/_layout.tsx` (required for gestures to work on mobile)

**Why this approach was chosen:** Multiple earlier attempts failed on mobile —
- `TouchableOpacity` onPressIn has scroll delay
- `Pressable` onPressIn intercepted by ScrollView's native gesture recognizer
- `onTouchStart` on View also intercepted
- `PanResponder` JS-layer only, native scroll view wins
- `scrollEnabled` toggling had a race condition
- Solution: RNGH operates at native gesture layer, properly negotiates with ScrollView

**`FavoriteCard` component is in `app/(tabs)/user.tsx`**, styles in `app/(tabs)/user_styles.tsx`.
