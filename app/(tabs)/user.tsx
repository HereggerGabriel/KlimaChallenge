import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ScrollView, TouchableOpacity, View, ActivityIndicator } from "react-native";
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
import { router, useFocusEffect } from "expo-router";
import { FinancialOverview } from "@/components/ui/FinancialOverview";
import { QuickAddTripModal } from "@/components/ui/QuickAddTripModal";
import { TripDetailModal } from "@/components/ui/TripDetailModal";
import UserLevelCard from "@/components/ui/UserLevelCard";
import { XPToast } from "@/components/ui/XPToast";
import { LevelUpOverlay } from "@/components/ui/LevelUpOverlay";
import { MainQuestOverlay } from "@/components/ui/MainQuestOverlay";
import { MAIN_QUEST_CELEBRATED_KEY } from "@/utils/questSystem";
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
import { styles } from "./_user_styles";
import { supabase } from "@/lib/supabase";
import { TRANSPORT_COLOR } from "@/constants/transport";

const TRIPS_PREVIEW = 5;


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
	const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
	const [trips, setTrips] = useState<Trip[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [userXP, setUserXP] = useState(0);
	const [userLevel, setUserLevel] = useState(1);
	const [showAllTrips, setShowAllTrips] = useState(false);
	const [xpGained, setXpGained] = useState<number | null>(null);
	const [levelUpData, setLevelUpData] = useState<{ level: number } | null>(null);
	const [userName, setUserName] = useState("");
	const [klimaTicketCost, setKlimaTicketCost] = useState(1400);
	const [mainQuestOverlay, setMainQuestOverlay] = useState<{ totalCost: number; klimaTicketCost: number } | null>(null);

	const loadProfile = useCallback(async () => {
		const [storedName, storedCost] = await Promise.all([
			AsyncStorage.getItem("userName"),
			AsyncStorage.getItem("klimaTicketCost"),
		]);
		if (storedName) setUserName(storedName);
		if (storedCost) {
			const parsed = parseFloat(storedCost);
			if (!isNaN(parsed) && parsed > 0) setKlimaTicketCost(parsed);
		}
	}, []);

	useEffect(() => {
		const init = async () => {
			const loaded = await loadTrips();
			setTrips(loaded);
			setIsLoading(false);

			const storedXP = await AsyncStorage.getItem("userXP");
			const parsedXP = storedXP ? parseInt(storedXP) : NaN;
			if (!isNaN(parsedXP)) {
				setUserXP(parsedXP);
				setUserLevel(calculateLevel(parsedXP));
			} else {
				const seeded = loaded.reduce(
					(total, trip) => total + getXPForTrip(trip.distance, trip.transportType),
					0,
				);
				await AsyncStorage.setItem("userXP", seeded.toString());
				setUserXP(seeded);
				setUserLevel(calculateLevel(seeded));
			}

			await loadProfile();
		};
		init();
	}, []);

	useFocusEffect(useCallback(() => {
		loadProfile();
		loadTrips().then((loaded) => {
			setTrips(loaded);
			AsyncStorage.getItem("userXP").then((storedXP) => {
				const parsedXP = storedXP ? parseInt(storedXP) : NaN;
				if (!isNaN(parsedXP)) {
					setUserXP(parsedXP);
					setUserLevel(calculateLevel(parsedXP));
				} else {
					const seeded = loaded.reduce(
						(total, trip) => total + getXPForTrip(trip.distance, trip.transportType),
						0,
					);
					AsyncStorage.setItem("userXP", seeded.toString());
					setUserXP(seeded);
					setUserLevel(calculateLevel(seeded));
				}
			});
		});
	}, [loadProfile]));

	useEffect(() => {
		if (!isLoading) {
			saveTrips(trips);
		}
	}, [trips, isLoading]);

	const favorites = useMemo(() => computeFavorites(trips), [trips]);

	const handleLogout = async () => {
		await supabase.auth.signOut();
		router.replace("/onboarding");
	};

	const handleTripPress = (trip: Trip) => {
		setSelectedTrip(trip);
	};

	const handleDeleteTrip = async (tripId: string) => {
		const trip = trips.find((t) => t.id === tripId);
		if (!trip) return;
		const removedXP = getXPForTrip(trip.distance, trip.transportType);
		const newXP = Math.max(0, userXP - removedXP);
		await AsyncStorage.setItem("userXP", newXP.toString());
		setUserXP(newXP);
		setUserLevel(calculateLevel(newXP));
		setTrips((prev) => prev.filter((t) => t.id !== tripId));
	};

	const handleEditTrip = async (tripId: string, updates: Partial<Trip>) => {
		const trip = trips.find((t) => t.id === tripId);
		if (!trip) return;
		const oldXP = getXPForTrip(trip.distance, trip.transportType);
		const updatedTrip = { ...trip, ...updates };
		const newTripXP = getXPForTrip(updatedTrip.distance, updatedTrip.transportType);
		const newXP = Math.max(0, userXP + (newTripXP - oldXP));
		await AsyncStorage.setItem("userXP", newXP.toString());
		setUserXP(newXP);
		setUserLevel(calculateLevel(newXP));
		setTrips((prev) => prev.map((t) => (t.id === tripId ? updatedTrip : t)));
		setSelectedTrip(updatedTrip);
	};

	const checkMainQuest = async (allTrips: Trip[], ticketCost: number) => {
		const totalCost = allTrips.reduce((sum, t) => sum + t.cost, 0);
		if (totalCost < ticketCost) return;
		const celebrated = await AsyncStorage.getItem(MAIN_QUEST_CELEBRATED_KEY);
		if (celebrated) return;
		await AsyncStorage.setItem(MAIN_QUEST_CELEBRATED_KEY, 'true');
		setMainQuestOverlay({ totalCost, klimaTicketCost: ticketCost });
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
		const newLevel = calculateLevel(newXP);
		await AsyncStorage.setItem("userXP", newXP.toString());
		setUserXP(newXP);
		setXpGained(tripXP);
		if (newLevel > userLevel) setLevelUpData({ level: newLevel });
		setUserLevel(newLevel);
		const updatedTrips = [newTrip, ...trips];
		setTrips(updatedTrips);
		await checkMainQuest(updatedTrips, klimaTicketCost);
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
		const newLevel = calculateLevel(newXP);
		await AsyncStorage.setItem("userXP", newXP.toString());
		setUserXP(newXP);
		setXpGained(tripXP);
		if (newLevel > userLevel) setLevelUpData({ level: newLevel });
		setUserLevel(newLevel);

		const updatedTrips = [newTrip, ...trips];
		setTrips(updatedTrips);
		setShowQuickAdd(false);
		await checkMainQuest(updatedTrips, klimaTicketCost);
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
	const visibleTrips = showAllTrips ? trips : trips.slice(0, TRIPS_PREVIEW);

	const recentPlaces = useMemo(() => {
		const counts = new Map<string, number>();
		for (const t of trips) {
			counts.set(t.origin, (counts.get(t.origin) ?? 0) + 1);
			counts.set(t.destination, (counts.get(t.destination) ?? 0) + 1);
		}
		return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([p]) => p);
	}, [trips]);

	if (isLoading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={Palette.green.mid} />
			</View>
		);
	}

	return (
		<View style={styles.root}>
		<ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
			{/* Header */}
			<View style={styles.header}>
				<View style={{ flex: 1 }}>
					<ThemedText type="title" style={styles.headerTitle}>
						My Climate Journey
					</ThemedText>
					<ThemedText style={styles.subtitle}>Track your impact and savings</ThemedText>
				</View>
				<TouchableOpacity onPress={() => router.push("/profile")} activeOpacity={0.8}>
					<View style={styles.avatarCircle}>
						<ThemedText style={styles.avatarInitial}>
							{userName.trim() ? userName.trim()[0].toUpperCase() : "?"}
						</ThemedText>
					</View>
				</TouchableOpacity>
			</View>

			<UserLevelCard
				level={userLevel}
				currentXP={calculateCurrentLevelXP(userXP, userLevel)}
				xpToNextLevel={calculateXPForNextLevel(userLevel)}
				onQuestsPress={() => router.push('/quests')}
			/>

			<FinancialOverview
				totalTrips={trips.length}
				totalDistance={totalDistance}
				totalCost={totalCost}
				klimaTicketCost={klimaTicketCost}
				onStatsPress={() => router.push('/stats')}
			/>

			{/* Favorites */}
			{favorites.length > 0 && (
				<View style={styles.section}>
					<View style={styles.sectionTitleRow}>
						<IconSymbol name="star.fill" size={16} color={Palette.green.mid} />
						<ThemedText type="subtitle" style={styles.sectionTitle}>
							Favorites
						</ThemedText>
					</View>
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

			{/* Recent Trips */}
			<View style={styles.section}>
				<View style={styles.sectionHeader}>
					<View style={styles.sectionTitleRow}>
						<IconSymbol name="clock" size={16} color={Palette.blue.light} />
						<ThemedText type="subtitle" style={styles.sectionTitle}>
							Recent Trips
						</ThemedText>
					</View>
					<TouchableOpacity style={styles.addButton} onPress={() => setShowQuickAdd(true)}>
						<IconSymbol name="plus.circle.fill" size={20} color="#fff" />
						<ThemedText style={styles.addButtonText}>Add Trip</ThemedText>
					</TouchableOpacity>
				</View>

				{trips.length === 0 && (
					<View style={styles.emptyState}>
						<IconSymbol name="bus" size={36} color="rgba(255,255,255,0.18)" />
						<ThemedText style={styles.emptyStateTitle}>No trips yet</ThemedText>
						<ThemedText style={styles.emptyStateSubtitle}>
							Add your first trip to start tracking your climate impact
						</ThemedText>
						<TouchableOpacity style={styles.emptyStateCTA} onPress={() => setShowQuickAdd(true)}>
							<IconSymbol name="plus.circle.fill" size={18} color="#fff" />
							<ThemedText style={styles.emptyStateCTAText}>Add Trip</ThemedText>
						</TouchableOpacity>
					</View>
				)}

				{visibleTrips.map((trip) => (
					<TouchableOpacity key={trip.id} onPress={() => handleTripPress(trip)} activeOpacity={0.75}>
						<View style={styles.tripCard}>
							<View
								style={[styles.tripAccentBar, { backgroundColor: TRANSPORT_COLOR[trip.transportType] ?? Palette.blue.mid }]}
							/>
							<View style={styles.tripCardContent}>
								<View style={styles.tripHeader}>
									<View style={{ flex: 1, marginRight: 8 }}>
										<ThemedText style={styles.tripTitle} numberOfLines={1}>
											{trip.origin} → {trip.destination}
										</ThemedText>
										<ThemedText style={styles.tripDate}>
											{formatDate(trip.date)} · {formatTime(trip.date)}
										</ThemedText>
									</View>
									<ThemedText style={styles.tripCost}>€{trip.cost.toFixed(2)}</ThemedText>
								</View>
								<View style={styles.tripDetails}>
									<View style={styles.tripDetail}>
										<IconSymbol name="bus" size={14} color="rgba(255,255,255,0.45)" />
										<ThemedText style={styles.tripDetailText}>{trip.transportType}</ThemedText>
									</View>
									<View style={styles.tripDetail}>
										<IconSymbol name="ruler" size={14} color="rgba(255,255,255,0.45)" />
										<ThemedText style={styles.tripDetailText}>{trip.distance} km</ThemedText>
									</View>
									{trip.description ? (
										<View style={styles.tripDetail}>
											<IconSymbol name="text.bubble" size={14} color="rgba(255,255,255,0.45)" />
											<ThemedText style={styles.tripDetailText} numberOfLines={1}>
												{trip.description}
											</ThemedText>
										</View>
									) : null}
								</View>
							</View>
						</View>
					</TouchableOpacity>
				))}

				{trips.length > TRIPS_PREVIEW && (
					<TouchableOpacity
						style={styles.showAllButton}
						onPress={() => setShowAllTrips((v) => !v)}
					>
						<ThemedText style={styles.showAllText}>
							{showAllTrips ? "Show less" : `Show all ${trips.length} trips`}
						</ThemedText>
						<IconSymbol
							name={showAllTrips ? "chevron.up" : "chevron.down"}
							size={14}
							color={Palette.blue.light}
						/>
					</TouchableOpacity>
				)}
			</View>

			{/* Logout */}
			<View style={styles.logoutSection}>
				<TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
					<IconSymbol name="rectangle.portrait.and.arrow.right" size={18} color={Palette.red.light} />
					<ThemedText style={styles.logoutButtonText}>Log Out</ThemedText>
				</TouchableOpacity>
			</View>

			<QuickAddTripModal
				visible={showQuickAdd}
				onClose={() => setShowQuickAdd(false)}
				onSubmit={handleQuickAddSubmit}
				recentPlaces={recentPlaces}
			/>
			<TripDetailModal
				visible={selectedTrip !== null}
				trip={selectedTrip}
				onClose={() => setSelectedTrip(null)}
				onDelete={handleDeleteTrip}
				onEdit={handleEditTrip}
				recentPlaces={recentPlaces}
			/>
		</ScrollView>
		<XPToast xp={xpGained} onDone={() => setXpGained(null)} />
		<LevelUpOverlay
			visible={levelUpData !== null}
			newLevel={levelUpData?.level ?? 1}
			onDone={() => setLevelUpData(null)}
		/>
		<MainQuestOverlay
			visible={mainQuestOverlay !== null}
			totalCost={mainQuestOverlay?.totalCost ?? 0}
			klimaTicketCost={mainQuestOverlay?.klimaTicketCost ?? 1400}
			onGoToClaim={() => {
				setMainQuestOverlay(null);
				router.push('/quests');
			}}
		/>
		</View>
	);
}

