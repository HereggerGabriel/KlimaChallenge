import type MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Palette } from "@/constants/Colors";

export type MaterialIconName = React.ComponentProps<typeof MaterialIcons>["name"];

export const TRANSPORT_COLOR: Record<string, string> = {
  Bus: Palette.blue.mid,
  Train: Palette.green.mid,
  Tram: Palette.red.light,
  Subway: Palette.green.dark,
};

export function transportIcon(type: string): MaterialIconName {
  switch (type) {
    case "Train":
      return "train";
    case "Bus":
      return "directions-bus";
    case "Tram":
      return "tram";
    case "Subway":
      return "subway";
    default:
      return "directions-transit";
  }
}
