import React, { useState, useRef, useEffect } from "react";
import {
	Modal,
	View,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	ScrollView,
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Palette } from "@/constants/Colors";
import { TripRouteFields } from "@/components/ui/TripRouteFields";
import {
	searchConnections,
	mapTransportType,
	summariseJourney,
	estimateDistanceKm,
	OebbJourney,
	OebbStation,
} from "@/services/oebbApi";

type PrefillData = {
	origin: string;
	destination: string;
	transportType: string;
	cost: string;
	distance: string;
	description: string;
};

type QuickAddTripModalProps = {
	visible: boolean;
	onClose: () => void;
	onSubmit: (trip: {
		date: Date;
		origin: string;
		destination: string;
		transportType: string;
		cost: number;
		description?: string;
		distance: number;
	}) => void;
	recentPlaces?: string[];
	prefill?: PrefillData;
};

const TRANSPORT_TYPES = ["Bus", "Train", "Tram", "Subway"];

export function QuickAddTripModal({ visible, onClose, onSubmit, recentPlaces = [], prefill }: QuickAddTripModalProps) {
	const [date, setDate] = useState(new Date());
	const [origin, setOrigin] = useState("");
	const [destination, setDestination] = useState("");
	const [transportType, setTransportType] = useState("");
	const [cost, setCost] = useState("");
	const [description, setDescription] = useState("");
	const [distance, setDistance] = useState("");
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [showTimePicker, setShowTimePicker] = useState(false);
	const [showTransportPicker, setShowTransportPicker] = useState(false);

	const [connections, setConnections] = useState<OebbJourney[]>([]);
	const [searchedStations, setSearchedStations] = useState<{ from: OebbStation; to: OebbStation } | null>(null);
	const [loadingConnections, setLoadingConnections] = useState(false);
	const [connectionError, setConnectionError] = useState("");
	const [showConnections, setShowConnections] = useState(false);
	const [selectedConnectionIndex, setSelectedConnectionIndex] = useState<number | null>(null);
	const [estimatingDistance, setEstimatingDistance] = useState(false);
	const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Populate fields from prefill when the modal opens
	useEffect(() => {
		if (visible && prefill) {
			setDate(new Date());
			setOrigin(prefill.origin);
			setDestination(prefill.destination);
			setTransportType(prefill.transportType);
			setCost(prefill.cost);
			setDistance(prefill.distance);
			setDescription(prefill.description);
			setConnections([]);
			setShowConnections(false);
			setSelectedConnectionIndex(null);
			setConnectionError("");
		}
	}, [visible]);

	const canSearch = origin.trim().length > 0 && destination.trim().length > 0;

	const handleSearchOebb = () => {
		if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
		searchDebounceRef.current = setTimeout(async () => {
			setLoadingConnections(true);
			setConnectionError("");
			setShowConnections(false);
			setSelectedConnectionIndex(null);
			try {
				const { journeys, fromStation, toStation } = await searchConnections(origin.trim(), destination.trim(), new Date(), 5);
				setConnections(journeys);
				setSearchedStations({ from: fromStation, to: toStation });
				setShowConnections(true);
			} catch (e: any) {
				setConnectionError(e.message ?? "Search failed");
			} finally {
				setLoadingConnections(false);
			}
		}, 400);
	};

	const handleSelectConnection = (journey: OebbJourney, index: number) => {
		const summary = summariseJourney(journey, searchedStations ?? undefined);
		setDate(summary.dep);
		setTransportType(mapTransportType(journey));
		if (summary.price?.amount !== undefined) setCost(String(summary.price.amount));
		if (summary.distanceKm > 0) setDistance(String(summary.distanceKm));
		const descParts = [
			`${origin.trim()} → ${destination.trim()}`,
			summary.depLabel,
			...(summary.trainNames.length > 0 ? [summary.trainNames.join(" → ")] : []),
		];
		setDescription(descParts.join(" · "));
		setSelectedConnectionIndex(index);
		setShowConnections(false);
	};

	const handleEstimate = async () => {
		if (!origin.trim() || !destination.trim()) return;
		setEstimatingDistance(true);
		try {
			const km = await estimateDistanceKm(origin.trim(), destination.trim());
			setDistance(String(km));
		} catch {
			// silently fail
		} finally {
			setEstimatingDistance(false);
		}
	};

	const handleSubmit = () => {
		if (!origin || !destination || !transportType || !cost || !distance) return;
		onSubmit({
			date,
			origin,
			destination,
			transportType,
			cost: parseFloat(cost),
			description: description.trim() || undefined,
			distance: parseFloat(distance),
		});
		setDate(new Date());
		setOrigin("");
		setDestination("");
		setTransportType("");
		setCost("");
		setDescription("");
		setDistance("");
		setConnections([]);
		setShowConnections(false);
		setSelectedConnectionIndex(null);
		setConnectionError("");
		onClose();
	};

	const renderConnectionPicker = () => {
		if (!showConnections || connections.length === 0) return null;
		return (
			<View style={styles.connectionList}>
				<ThemedText style={styles.connectionListLabel}>Select a connection:</ThemedText>
				<ScrollView style={styles.connectionScroll} nestedScrollEnabled>
					{connections.map((journey, i) => {
						const s = summariseJourney(journey, searchedStations ?? undefined);
						const isSelected = selectedConnectionIndex === i;
						return (
							<TouchableOpacity
								key={i}
								style={[styles.connectionItem, isSelected && styles.connectionItemSelected]}
								onPress={() => handleSelectConnection(journey, i)}
							>
								<View style={styles.connectionRow}>
									<ThemedText style={[styles.connectionTime, isSelected && styles.connectionTimeSelected]}>
										{s.depLabel} → {s.arrLabel}
									</ThemedText>
									{s.price
										? <ThemedText style={[styles.connectionPrice, isSelected && styles.connectionPriceSelected]}>€{s.price.amount.toFixed(2)}</ThemedText>
										: <ThemedText style={styles.connectionNoPrice}>—</ThemedText>
									}
								</View>
								<ThemedText style={styles.connectionMeta}>
									{Math.floor(s.durationMin / 60)}h {s.durationMin % 60}m
									{s.transfers > 0 ? ` · ${s.transfers} transfer${s.transfers > 1 ? "s" : ""}` : " · direct"}
									{s.trainNames.length > 0 ? `  ·  ${s.trainNames.join(" → ")}` : ""}
								</ThemedText>
							</TouchableOpacity>
						);
					})}
				</ScrollView>
			</View>
		);
	};

	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
			<KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
				<ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>
					<ThemedView style={styles.modalContent}>
						<View style={styles.header}>
							<ThemedText type="subtitle">Quick Add Trip</ThemedText>
							<TouchableOpacity onPress={onClose}>
								<IconSymbol name="xmark.circle.fill" size={24} color="rgba(255,255,255,0.5)" />
							</TouchableOpacity>
						</View>

						{/* Origin, Swap, Destination */}
						<TripRouteFields
							origin={origin}
							onOriginChange={(v) => { setOrigin(v); setShowConnections(false); setSelectedConnectionIndex(null); }}
							destination={destination}
							onDestinationChange={(v) => { setDestination(v); setShowConnections(false); setSelectedConnectionIndex(null); }}
							cost={cost}
							onCostChange={setCost}
							distance={distance}
							onDistanceChange={setDistance}
							transportType={transportType}
							recentPlaces={recentPlaces}
							showDistance={false}
						/>

						{/* ÖBB Search */}
						<ThemedText style={styles.fieldLabel}>Connection</ThemedText>
						{canSearch && (
							<TouchableOpacity
								style={[styles.searchButton, loadingConnections && styles.searchButtonDisabled]}
								onPress={handleSearchOebb}
								disabled={loadingConnections}
							>
								{loadingConnections
									? <ActivityIndicator size="small" color="#fff" />
									: <IconSymbol name="magnifyingglass" size={16} color="#fff" />
								}
								<ThemedText style={styles.searchButtonText}>
									{loadingConnections ? "Searching…" : "Find Connections"}
								</ThemedText>
							</TouchableOpacity>
						)}
						{connectionError ? <ThemedText style={styles.errorText}>{connectionError}</ThemedText> : null}
						{renderConnectionPicker()}

						{/* Date */}
						<TouchableOpacity
							style={styles.pickerButton}
							onPress={() => { setShowTimePicker(false); setShowDatePicker((v) => !v); }}
						>
							<MaterialIcons name="calendar-today" size={20} color="rgba(255,255,255,0.5)" />
							<ThemedText style={styles.pickerButtonText}>
								{date.toLocaleDateString("en-AT", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
							</ThemedText>
						</TouchableOpacity>
						{showDatePicker && (
							<>
								<DateTimePicker
									value={date}
									mode="date"
									display={Platform.OS === "ios" ? "spinner" : "default"}
									onChange={(_, selected) => {
										if (Platform.OS === "android") setShowDatePicker(false);
										if (selected) {
											const d = new Date(selected);
											d.setHours(date.getHours(), date.getMinutes(), 0, 0);
											setDate(d);
										}
									}}
									textColor="#fff"
									themeVariant="dark"
								/>
								{Platform.OS === "ios" && (
									<TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.pickerDoneButton}>
										<ThemedText style={styles.pickerDoneText}>Done</ThemedText>
									</TouchableOpacity>
								)}
							</>
						)}

						{/* Time */}
						<TouchableOpacity
							style={styles.pickerButton}
							onPress={() => { setShowDatePicker(false); setShowTimePicker((v) => !v); }}
						>
							<MaterialIcons name="access-time" size={20} color="rgba(255,255,255,0.5)" />
							<ThemedText style={styles.pickerButtonText}>
								{date.toLocaleTimeString("en-AT", { hour: "2-digit", minute: "2-digit", hour12: false })}
							</ThemedText>
						</TouchableOpacity>
						{showTimePicker && (
							<>
								<DateTimePicker
									value={date}
									mode="time"
									display={Platform.OS === "ios" ? "spinner" : "default"}
									is24Hour={true}
									onChange={(_, selected) => {
										if (Platform.OS === "android") setShowTimePicker(false);
										if (selected) setDate(selected);
									}}
									textColor="#fff"
									themeVariant="dark"
								/>
								{Platform.OS === "ios" && (
									<TouchableOpacity onPress={() => setShowTimePicker(false)} style={styles.pickerDoneButton}>
										<ThemedText style={styles.pickerDoneText}>Done</ThemedText>
									</TouchableOpacity>
								)}
							</>
						)}

						{/* Transport Type */}
						<TouchableOpacity style={styles.pickerButton} onPress={() => setShowTransportPicker(true)}>
							<IconSymbol name="bus" size={20} color="rgba(255,255,255,0.5)" />
							<ThemedText style={[styles.pickerButtonText, !transportType && styles.pickerButtonPlaceholder]}>
								{transportType || "Select transport type"}
							</ThemedText>
						</TouchableOpacity>
						{showTransportPicker && (
							<View style={styles.transportPicker}>
								{TRANSPORT_TYPES.map((type) => (
									<TouchableOpacity
										key={type}
										style={[styles.transportOption, transportType === type && styles.transportOptionSelected]}
										onPress={() => { setTransportType(type); setShowTransportPicker(false); }}
									>
										<ThemedText style={[styles.transportOptionText, transportType === type && styles.transportOptionTextSelected]}>
											{type}
										</ThemedText>
									</TouchableOpacity>
								))}
							</View>
						)}

						{/* Cost */}
						<ThemedText style={styles.fieldLabel}>Ticket Price</ThemedText>
						<View style={styles.inputContainer}>
							<ThemedText style={styles.affix}>€</ThemedText>
							<TextInput style={styles.input} value={cost} onChangeText={setCost} placeholder="0.00" keyboardType="decimal-pad" placeholderTextColor="rgba(255,255,255,0.3)" />
						</View>

						{/* Distance */}
						<ThemedText style={styles.fieldLabel}>Distance</ThemedText>
						<View style={styles.inputContainer}>
							<TextInput style={[styles.input, { marginLeft: 0 }]} value={distance} onChangeText={setDistance} placeholder="0.0" keyboardType="decimal-pad" placeholderTextColor="rgba(255,255,255,0.3)" />
							<ThemedText style={styles.affix}>km</ThemedText>
							{(origin.trim().length > 0 && destination.trim().length > 0) && (
								<TouchableOpacity style={styles.estimateButton} onPress={handleEstimate} disabled={estimatingDistance}>
									{estimatingDistance
										? <ActivityIndicator size="small" color="#fff" />
										: <ThemedText style={styles.estimateButtonText}>Estimate</ThemedText>
									}
								</TouchableOpacity>
							)}
						</View>

						{/* Description */}
						<View style={styles.inputContainer}>
							<IconSymbol name="text.bubble" size={20} color="rgba(255,255,255,0.5)" />
							<TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Description (optional)" placeholderTextColor="rgba(255,255,255,0.3)" />
						</View>

						{/* Submit */}
						<TouchableOpacity
							style={[styles.submitButton, (!origin || !destination || !cost || !distance) && styles.submitButtonDisabled]}
							onPress={handleSubmit}
							disabled={!origin || !destination || !cost || !distance}
						>
							<ThemedText style={styles.submitButtonText}>Add Trip</ThemedText>
						</TouchableOpacity>
					</ThemedView>
				</ScrollView>
			</KeyboardAvoidingView>
		</Modal>
	);
}

const styles = StyleSheet.create({
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
	},
	modalScrollContent: {
		flexGrow: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
	},
	modalContent: {
		width: "90%",
		maxWidth: 400,
		backgroundColor: Palette.blue.dark,
		borderRadius: 12,
		padding: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 4,
		elevation: 5,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 6,
	},
	searchButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
		backgroundColor: Palette.blue.mid,
		padding: 10,
		borderRadius: 8,
		marginBottom: 10,
		marginTop: 6,
	},
	searchButtonDisabled: { opacity: 0.6 },
	searchButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
	errorText: { color: Palette.red.mid, fontSize: 13, marginBottom: 8, textAlign: "center" },
	connectionList: {
		marginBottom: 10,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.12)",
		borderRadius: 8,
		overflow: "hidden",
	},
	connectionListLabel: { fontSize: 12, color: "rgba(255,255,255,0.4)", paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
	connectionScroll: { maxHeight: 220 },
	connectionItem: { padding: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" },
	connectionItemSelected: { backgroundColor: Palette.blue.mid },
	connectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
	connectionTime: { fontSize: 15, fontWeight: "600", color: "rgba(255,255,255,0.85)" },
	connectionTimeSelected: { color: "#fff" },
	connectionPrice: { fontSize: 14, fontWeight: "700", color: Palette.green.light },
	connectionPriceSelected: { color: Palette.green.light },
	connectionNoPrice: { fontSize: 14, color: "rgba(255,255,255,0.3)" },
	connectionMeta: { fontSize: 12, color: "rgba(255,255,255,0.4)" },
	pickerButton: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "rgba(255,255,255,0.08)",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.15)",
		paddingHorizontal: 14,
		paddingVertical: 11,
		borderRadius: 10,
		marginTop: 10,
		marginBottom: 4,
	},
	pickerButtonText: { marginLeft: 8, fontSize: 15, color: "#fff" },
	pickerButtonPlaceholder: { color: "rgba(255,255,255,0.3)" },
	pickerDoneButton: {
		alignItems: "flex-end",
		paddingHorizontal: 14,
		paddingVertical: 6,
		marginBottom: 4,
	},
	pickerDoneText: {
		color: Palette.green.mid,
		fontSize: 15,
		fontWeight: "600",
	},
	inputContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "rgba(255,255,255,0.08)",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.15)",
		paddingHorizontal: 14,
		paddingVertical: 11,
		borderRadius: 10,
		marginBottom: 13,
	},
	input: { flex: 1, marginLeft: 8, fontSize: 15, color: "#fff" },
	fieldLabel: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.5)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 5, marginTop: 3 },
	affix: { fontSize: 15, color: "rgba(255,255,255,0.5)", paddingHorizontal: 4 },
	estimateButton: { backgroundColor: Palette.blue.mid, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, marginLeft: 6 },
	estimateButtonText: { color: "#fff", fontSize: 12, fontWeight: "600" },
	submitButton: {
		backgroundColor: Palette.green.mid,
		padding: 12,
		borderRadius: 8,
		alignItems: "center",
		marginTop: 6,
	},
	submitButtonDisabled: { backgroundColor: "rgba(255,255,255,0.15)" },
	submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
	transportPicker: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 10, marginBottom: 13, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
	transportOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
	transportOptionSelected: { backgroundColor: Palette.blue.mid },
	transportOptionText: { color: "rgba(255,255,255,0.7)", fontSize: 16 },
	transportOptionTextSelected: { color: "#fff", fontWeight: "600" },
});
