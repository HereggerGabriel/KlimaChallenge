// XP required to complete level N (i.e. to advance from level N to N+1)
export const calculateXPForNextLevel = (level: number): number => {
  return Math.floor(100 * Math.pow(1.5, level - 1));
};

// Cumulative XP needed to *reach* the start of a given level
const xpThreshold = (level: number): number => {
  if (level <= 1) return 0;
  let total = 0;
  for (let l = 1; l < level; l++) {
    total += calculateXPForNextLevel(l);
  }
  return total;
};

export const calculateLevel = (totalXP: number): number => {
  let level = 1;
  while (xpThreshold(level + 1) <= totalXP) {
    level++;
  }
  return level;
};

// XP progress within the current level (always 0 or above)
export const calculateCurrentLevelXP = (totalXP: number, currentLevel: number): number => {
  return Math.max(0, totalXP - xpThreshold(currentLevel));
};

export const addXP = (currentXP: number, amount: number): number => {
  return currentXP + amount;
};

export const getXPForTrip = (distance: number, transportType: string): number => {
  let baseXP = 10;
  const distanceXP = Math.min(distance, 50);
  baseXP += distanceXP;

  switch (transportType.toLowerCase()) {
    case 'tram':   baseXP *= 1.4; break;
    case 'subway': baseXP *= 1.3; break;
    case 'train':  baseXP *= 1.2; break;
    case 'bus':    baseXP *= 1.1; break;
  }

  return Math.round(baseXP);
};
