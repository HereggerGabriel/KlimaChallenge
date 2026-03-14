import React, { useState, useEffect } from "react";
import { ScrollView, TouchableOpacity, View, Alert } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
	useSharedValue,
	withTiming,
	withSequence,
	useAnimatedStyle,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Palette } from "@/constants/Colors";
import { router } from "expo-router";
import { FinancialOverview } from "@/components/ui/FinancialOverview";
import { QuickAddTripModal } from "@/components/ui/QuickAddTripModal";
import UserLevelCard from "@/components/ui/UserLevelCard";
import {
	calculateLevel,
	calculateXPForNextLevel,
	calculateCurrentLevelXP,
	getXPForTrip,
	addXP,
} from "@/utils/levelSystem";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Trip } from "@/types/trip";
import { loadTrips, saveTrips } from "@/services/tripStorage";
import { styles } from "./user_styles";

type FavoriteTrip = {
	origin: string;
	destination: string;
	transportType: string;
	distance: number;
	cost: number;
	count: number;
};

function computeFavorites(trips: Trip[]): FavoriteTrip[] {
	const map = new Map<string, FavoriteTrip>();
	for (const trip of trips) {
		const key = `${trip.origin}|${trip.destination}|${trip.transportType}`;
		const existing = map.get(key);
		if (existing) {
			existing.count++;
		} else {
			map.set(key, {
				origin: trip.origin,
				destination: trip.destination,
				transportType: trip.transportType,
				distance: trip.distance,
				cost: trip.cost,
				count: 1,
			});
		}
	}
	return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 4);
}

const HOLD_DURATION = 1000;

function FavoriteCard({ fav, onAdd }: { fav: FavoriteTrip; onAdd: () => void }) {
	const progress = useSharedValue(0);
	const flashOpacity = useSharedValue(0);

	const fillStyle = useAnimatedStyle(() => ({
		height: `${progress.value * 100}%` as any,
	}));

	const flashStyle = useAnimatedStyle(() => ({
		opacity: flashOpacity.value,
	}));

	const gesture = Gesture.LongPress()
		.minDuration(HOLD_DURATION)
		.runOnJS(true)
		.onBegin(() => {
			progress.value = withTiming(1, { duration: HOLD_DURATION });
		})
		.onStart(() => {
			progress.value = 0;
			flashOpacity.value = withSequence(
				withTiming(1, { duration: 120 }),
				withTiming(0, { duration: 220 }),
			);
			onAdd();
		})
		.onFinalize((_e, success) => {
			if (!success) {
				progress.value = 0;
			}
		});

	return (
		<GestureDetector gesture={gesture}>
			<View style={styles.favoriteCard}>
				<Animated.View style={[styles.fillOverlay, fillStyle]} />
				<Animated.View style={[styles.flashOverlay, flashStyle]} />

				<View style={styles.favoriteCardTop}>
					<ThemedText style={styles.favoriteRoute} numberOfLines={1}>
						{fav.origin} → {fav.destination}
					</ThemedText>
					<View style={styles.favoriteBadge}>
						<ThemedText style={styles.favoriteBadgeText}>{fav.count}×</ThemedText>
					</View>
				</View>
				<View style={styles.favoriteCardBottom}>
					<IconSymbol name="bus" size={14} color={Palette.blue.light} />
					<ThemedText style={styles.favoriteTransport}>{fav.transportType}</ThemedText>
					<ThemedText style={styles.favoriteDistance}>{fav.distance} km</ThemedText>
				</View>
			</View>
		</GestureDetector>
	);
}

export default function UserScreen() {
	const [showQuickAdd, setShowQuickAdd] = useState(false);
	const [trips, setTrips] = useState<Trip[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [userXP, setUserXP] = useState(0);
	const [userLevel, setUserLevel] = useState(1);

	useEffect(() => {
		const init = async () => {
			const loaded = await loadTrips();
			setTrips(loaded);
			setIsLoading(false);

			const storedXP = await AsyncStorage.getItem("userXP");
			if (storedXP) {
				const xp = parseInt(storedXP);
				setUserXP(xp);
				setUserLevel(calculateLevel(xp));
			}
		};
		init();
	}, []);

	useEffect(() => {
		if (!isLoading) {
			saveTrips(trips);
		}
	}, [trips, isLoading]);

	const favorites = computeFavorites(trips);

	const handleLogout = () => {
		Alert.alert("Log out", "Are you sure?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Log out",
				style: "destructive",
				onPress: async () => {
					await AsyncStorage.multiRemove(["isAuthenticated", "userData"]);
					router.replace("/onboarding");
				},
			},
		]);
	};

	const handleTripPress = (tripId: string) => {
		router.push(`/trip/${tripId}` as any);
	};

	const handleFavoritePress = async (fav: FavoriteTrip) => {
		const newTrip: Trip = {
			id: Date.now().toString(),
			date: new Date(),
			origin: fav.origin,
			destination: fav.destination,
			transportType: fav.transportType,
			cost: fav.cost,
			distance: fav.distance,
			description: "",
		};
		const tripXP = getXPForTrip(fav.distance, fav.transportType);
		const newXP = addXP(userXP, tripXP);
		await AsyncStorage.setItem("userXP", newXP.toString());
		setUserXP(newXP);
		setUserLevel(calculateLevel(newXP));
		setTrips((prev) => [newTrip, ...prev]);
	};

	const handleQuickAddSubmit = async (tripData: {
		date: Date;
		origin: string;
		destination: string;
		transportType: string;
		cost: number;
		description?: string;
		distance: number;
	}) => {
		const newTrip: Trip = {
			id: Date.now().toString(),
			date: tripData.date,
			origin: tripData.origin,
			destination: tripData.destination,
			transportType: tripData.transportType,
			cost: tripData.cost,
			distance: tripData.distance,
			description: tripData.description || "",
		};

		const tripXP = getXPForTrip(tripData.distance, tripData.transportType);
		const newXP = addXP(userXP, tripXP);
		await AsyncStorage.setItem("userXP", newXP.toString());
		setUserXP(newXP);
		setUserLevel(calculateLevel(newXP));

		setTrips((prev) => [newTrip, ...prev]);
		setShowQuickAdd(false);
	};

	const formatDate = (date: Date) => {
		const d = date instanceof Date ? date : new Date(date);
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		if (d.toDateString() === today.toDateString()) return "Today";
		if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
		return d.toLocaleDateString("en-AT", { month: "short", day: "numeric" });
	};

	const formatTime = (date: Date) => {
		const d = date instanceof Date ? date : new Date(date);
		return d.toLocaleTimeString("en-AT", { hour: "2-digit", minute: "2-digit", hour12: false });
	};

	const totalCost = trips.reduce((sum, trip) => sum + trip.cost, 0);
	const totalDistance = trips.reduce((sum, trip) => sum + trip.distance, 0);

	if (isLoading) {
		return (
			<View style={styles.container}>
				<ThemedText>Loading trips...</ThemedText>
			</View>
		);
	}

	return (
		<ScrollView style={styles.container}>
			<View style={styles.header}>
				<ThemedText type="title" style={styles.headerTitle}>
					My Climate Journey
				</ThemedText>
				<View style={styles.headerSubRow}>
					<ThemedText style={styles.subtitle}>Track your impact and savings</ThemedText>
					<TouchableOpacity
						onPress={handleLogout}
						hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
					>
						<IconSymbol
							name="rectangle.portrait.and.arrow.right"
							size={22}
							color={Palette.red.light}
						/>
					</TouchableOpacity>
				</View>
			</View>

			<UserLevelCard
				level={userLevel}
				currentXP={calculateCurrentLevelXP(userXP, userLevel)}
				xpToNextLevel={calculateXPForNextLevel(userLevel)}
			/>

			<FinancialOverview
				totalTrips={trips.length}
				totalDistance={totalDistance}
				totalCost={totalCost}
				klimaTicketCost={1400.0}
			/>

			{favorites.length > 0 && (
				<View style={styles.section}>
					<ThemedText type="subtitle" style={styles.sectionTitle}>
						Favorites
					</ThemedText>
					<View style={styles.favoritesGrid}>
						{favorites.map((fav) => (
							<FavoriteCard
								key={`${fav.origin}|${fav.destination}|${fav.transportType}`}
								fav={fav}
								onAdd={() => handleFavoritePress(fav)}
							/>
						))}
					</View>
				</View>
			)}

			<View style={styles.section}>
				<View style={styles.sectionHeader}>
					<ThemedText type="subtitle">Recent Trips</ThemedText>
					<TouchableOpacity style={styles.addButton} onPress={() => setShowQuickAdd(true)}>
						<IconSymbol name="plus.circle.fill" size={24} color="#fff" />
						<ThemedText style={styles.addButtonText}>Add Trip</ThemedText>
					</TouchableOpacity>
				</View>

				{trips.map((trip) => (
					<TouchableOpacity key={trip.id} onPress={() => handleTripPress(trip.id)}>
						<View style={styles.tripCard}>
							<View style={styles.tripHeader}>
								<View>
									<ThemedText style={styles.tripTitle}>
										{trip.origin} → {trip.destination}
									</ThemedText>
									<ThemedText style={styles.tripDate}>
										{formatDate(trip.date)} {formatTime(trip.date)}
									</ThemedText>
								</View>
								<ThemedText style={styles.tripCost}>€{trip.cost.toFixed(2)}</ThemedText>
							</View>
							<View style={styles.tripDetails}>
								<View style={styles.tripDetail}>
									<IconSymbol name="bus" size={16} color="rgba(255,255,255,0.45)" />
									<ThemedText style={styles.tripDetailText}>{trip.transportType}</ThemedText>
								</View>
								<View style={styles.tripDetail}>
									<IconSymbol name="ruler" size={16} color="rgba(255,255,255,0.45)" />
									<ThemedText style={styles.tripDetailText}>{trip.distance} km</ThemedText>
								</View>
								{trip.description ? (
									<View style={styles.tripDetail}>
										<IconSymbol name="text.bubble" size={16} color="rgba(255,255,255,0.45)" />
										<ThemedText style={styles.tripDetailText}>{trip.description}</ThemedText>
									</View>
								) : null}
							</View>
						</View>
					</TouchableOpacity>
				))}
			</View>

			<QuickAddTripModal
				visible={showQuickAdd}
				onClose={() => setShowQuickAdd(false)}
				onSubmit={handleQuickAddSubmit}
			/>
		</ScrollView>
	);
}
