import React, { useEffect, useState } from "react";
import * as Haptics from "expo-haptics";
import { XPToast } from "@/components/ui/XPToast";
import { LevelUpOverlay } from "@/components/ui/LevelUpOverlay";
import { useAppData } from "@/store/AppData";

/**
 * App-wide "+XP" toast and level-up celebration, driven by the store's reward
 * events. Events play one after another: toast first, then the level-up
 * overlay if the reward crossed a level.
 */
export function RewardFeedback() {
  const { rewardEvents, dismissRewardEvent } = useAppData();
  const event = rewardEvents[0];
  const [showLevelUp, setShowLevelUp] = useState(false);

  useEffect(() => {
    if (!event) return;
    if (event.levelUp) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [event]);

  if (!event) return null;

  return (
    <>
      <XPToast
        key={event.id}
        xp={showLevelUp ? null : event.xp}
        onDone={() => (event.levelUp ? setShowLevelUp(true) : dismissRewardEvent())}
      />
      <LevelUpOverlay
        visible={showLevelUp}
        newLevel={event.levelUp ?? 1}
        onDone={() => {
          setShowLevelUp(false);
          dismissRewardEvent();
        }}
      />
    </>
  );
}
