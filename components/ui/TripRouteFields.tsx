import React, { useState, useEffect, useRef } from "react";
import {
	View,
	StyleSheet,
	TouchableOpacity,
	Pressable,
	TextInput,
	ScrollView,
	ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Palette } from "@/constants/Colors";
import { estimateDistanceKm } from "@/services/oebbApi";

const ROUTE_PRICES: { origins: string[]; destinations: string[]; transportType: string; price: number }[] = [
	{ origins: ["villach"], destinations: ["klagenfurt"], transportType: "Train", price: 10.20 },
	{ origins: ["villach"], destinations: ["wien"], transportType: "Train", price: 59.90 },
];

const TRANSPORT_FLAT_PRICES: Record<string, number> = {
	Bus: 2.50,
	Tram: 4.20,
	Subway: 4.20,
};

function lookupPrice(origin: string, dest: string, transportType: string): number | null {
	const o = origin.toLowerCase();
	const d = dest.toLowerCase();
	for (const preset of ROUTE_PRICES) {
		const fwd = preset.origins.some((x) => o.includes(x)) && preset.destinations.some((x) => d.includes(x));
		const rev = preset.destinations.some((x) => o.includes(x)) && preset.origins.some((x) => d.includes(x));
		if ((fwd || rev) && preset.transportType === transportType) return preset.price;
	}
	if (transportType in TRANSPORT_FLAT_PRICES) return TRANSPORT_FLAT_PRICES[transportType];
	return null;
}

type TripRouteFieldsProps = {
	origin: string;
	onOriginChange: (v: string) => void;
	destination: string;
	onDestinationChange: (v: string) => void;
	cost: string;
	onCostChange: (v: string) => void;
	distance: string;
	onDistanceChange: (v: string) => void;
	transportType: string;
	recentPlaces?: string[];
	/** 'light' = QuickAdd style (gray inputs, icons). 'dark' = Edit style (dark inputs, labels). */
	theme?: "light" | "dark";
	/** Set false to hide the distance row (render it yourself below). Defaults to true. */
	showDistance?: boolean;
};

export function TripRouteFields({
	origin,
	onOriginChange,
	destination,
	onDestinationChange,
	cost,
	onCostChange,
	distance,
	onDistanceChange,
	transportType,
	recentPlaces = [],
	theme = "light",
	showDistance = true,
}: TripRouteFieldsProps) {
	const dark = theme === "dark";

	const [originSelected, setOriginSelected] = useState(false);
	const [destSelected, setDestSelected] = useState(false);
	const [estimatingDistance, setEstimatingDistance] = useState(false);
	const mountedRef = useRef(false);

	const originSuggestions = !originSelected && origin.length > 0
		? recentPlaces.filter((p) => p.toLowerCase().includes(origin.toLowerCase()) && p !== origin).slice(0, 5)
		: [];
	const destSuggestions = !destSelected && destination.length > 0
		? recentPlaces.filter((p) => p.toLowerCase().includes(destination.toLowerCase()) && p !== destination).slice(0, 5)
		: [];

	// Price autofill when origin/destination/transport changes and cost is empty
	// Skip on initial mount so opening the modal doesn't pre-fill the price
	useEffect(() => {
		if (!mountedRef.current) {
			mountedRef.current = true;
			return;
		}
		if (!cost) {
			const suggested = lookupPrice(origin, destination, transportType);
			if (suggested !== null) onCostChange(String(suggested));
		}
	}, [origin, destination, transportType]);

	const handleSwap = () => {
		onOriginChange(destination);
		onDestinationChange(origin);
	};

	const handleEstimate = async () => {
		if (!origin.trim() || !destination.trim()) return;
		setEstimatingDistance(true);
		try {
			const km = await estimateDistanceKm(origin.trim(), destination.trim());
			onDistanceChange(String(km));
		} catch {
			// silently fail
		} finally {
			setEstimatingDistance(false);
		}
	};

	const canEstimate = origin.trim().length > 0 && destination.trim().length > 0;

	return (
		<View>
			{/* Origin */}
			{dark && <ThemedText style={styles.label}>Origin</ThemedText>}
			<View>
				<View style={dark ? styles.darkInputRow : styles.lightInputContainer}>
					{!dark && <IconSymbol name="mappin.circle.fill" size={20} color={Palette.blue.mid} />}
					<TextInput
						style={dark ? styles.darkInput : styles.lightInput}
						value={origin}
						onChangeText={(v) => { onOriginChange(v); setOriginSelected(false); }}
						placeholder="Origin"
						placeholderTextColor={dark ? "rgba(255,255,255,0.3)" : "#666"}
					/>
				</View>
				{originSuggestions.length > 0 && (
					<ScrollView
						style={dark ? styles.darkSuggestionList : styles.lightSuggestionList}
						keyboardShouldPersistTaps="always"
						scrollEnabled={false}
					>
						{originSuggestions.map((place) => (
							<Pressable
								key={place}
								style={styles.suggestionItem}
								onPress={() => { onOriginChange(place); setOriginSelected(true); }}
							>
								<MaterialIcons name="history" size={14} color={dark ? "rgba(255,255,255,0.4)" : "#999"} />
								<ThemedText style={dark ? styles.darkSuggestionText : styles.lightSuggestionText}>
									{place}
								</ThemedText>
							</Pressable>
						))}
					</ScrollView>
				)}
			</View>

			{/* Swap button */}
			<TouchableOpacity style={styles.swapButton} onPress={handleSwap}>
				<MaterialIcons name="swap-vert" size={20} color="#fff" />
			</TouchableOpacity>

			{/* Destination */}
			{dark && <ThemedText style={styles.label}>Destination</ThemedText>}
			<View>
				<View style={dark ? styles.darkInputRow : [styles.lightInputContainer, styles.lightInputContainerNoMargin]}>
					{!dark && <IconSymbol name="mappin.circle.fill" size={20} color={Palette.green.mid} />}
					<TextInput
						style={dark ? styles.darkInput : styles.lightInput}
						value={destination}
						onChangeText={(v) => { onDestinationChange(v); setDestSelected(false); }}
						placeholder="Destination"
						placeholderTextColor={dark ? "rgba(255,255,255,0.3)" : "#666"}
					/>
				</View>
				{destSuggestions.length > 0 && (
					<ScrollView
						style={dark ? styles.darkSuggestionList : styles.lightSuggestionList}
						keyboardShouldPersistTaps="always"
						scrollEnabled={false}
					>
						{destSuggestions.map((place) => (
							<Pressable
								key={place}
								style={styles.suggestionItem}
								onPress={() => { onDestinationChange(place); setDestSelected(true); }}
							>
								<MaterialIcons name="history" size={14} color={dark ? "rgba(255,255,255,0.4)" : "#999"} />
								<ThemedText style={dark ? styles.darkSuggestionText : styles.lightSuggestionText}>
									{place}
								</ThemedText>
							</Pressable>
						))}
					</ScrollView>
				)}
			</View>

			{/* Distance field with Estimate button */}
			{showDistance && <>
				{dark && <ThemedText style={styles.label}>Distance (km)</ThemedText>}
				<View style={dark ? styles.darkInputRow : styles.lightInputContainer}>
					{!dark && <IconSymbol name="ruler" size={20} color={Palette.blue.mid} />}
					<TextInput
						style={dark ? styles.darkInput : styles.lightInput}
						value={distance}
						onChangeText={onDistanceChange}
						placeholder="Distance (km)"
						keyboardType="numeric"
						placeholderTextColor={dark ? "rgba(255,255,255,0.3)" : "#666"}
					/>
					{canEstimate && (
						<TouchableOpacity
							style={styles.estimateButton}
							onPress={handleEstimate}
							disabled={estimatingDistance}
						>
							{estimatingDistance
								? <ActivityIndicator size="small" color="#fff" />
								: <ThemedText style={styles.estimateButtonText}>Estimate</ThemedText>
							}
						</TouchableOpacity>
					)}
				</View>
			</>}
		</View>
	);
}

const styles = StyleSheet.create({
	label: {
		fontSize: 11,
		fontWeight: "600",
		color: "rgba(255,255,255,0.5)",
		letterSpacing: 0.8,
		textTransform: "uppercase",
		marginBottom: 5,
		marginTop: 6,
	},
	// Light theme (QuickAddTripModal)
	lightInputContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#f5f5f5",
		padding: 12,
		borderRadius: 8,
		marginBottom: 4,
	},
	lightInputContainerNoMargin: {
		marginBottom: 0,
	},
	lightInput: {
		flex: 1,
		marginLeft: 8,
		fontSize: 16,
		color: "#000",
	},
	lightSuggestionList: {
		backgroundColor: "#f0f0f0",
		borderRadius: 8,
		marginBottom: 8,
		overflow: "hidden",
		borderWidth: 1,
		borderColor: "#ddd",
	},
	lightSuggestionText: {
		fontSize: 14,
		color: "#222",
	},
	// Dark theme (TripDetailModal)
	darkInputRow: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "rgba(255,255,255,0.08)",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.15)",
		borderRadius: 10,
		paddingHorizontal: 14,
		paddingVertical: 11,
	},
	darkInput: {
		flex: 1,
		color: "#fff",
		fontSize: 15,
	},
	darkSuggestionList: {
		backgroundColor: "rgba(255,255,255,0.06)",
		borderRadius: 8,
		marginTop: 2,
		marginBottom: 4,
		overflow: "hidden",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.12)",
	},
	darkSuggestionText: {
		fontSize: 14,
		color: "rgba(255,255,255,0.85)",
	},
	// Shared
	suggestionItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingVertical: 10,
		paddingHorizontal: 14,
		borderBottomWidth: 1,
		borderBottomColor: "rgba(0,0,0,0.06)",
	},
	swapButton: {
		alignSelf: "center",
		padding: 6,
		marginVertical: -8,
		borderRadius: 20,
		backgroundColor: Palette.green.mid,
		zIndex: 1,
	},
	estimateButton: {
		backgroundColor: Palette.blue.mid,
		paddingVertical: 5,
		paddingHorizontal: 10,
		borderRadius: 8,
		marginLeft: 6,
	},
	estimateButtonText: {
		color: "#fff",
		fontSize: 12,
		fontWeight: "600",
	},
});
