import React, { useState } from "react";
import {
	Modal,
	View,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	ScrollView,
	ActivityIndicator,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors, Palette } from "@/constants/Colors";
import {
	searchConnections,
	mapTransportType,
	summariseJourney,
	OebbJourney,
} from "@/services/oebbApi";

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
};

const TRANSPORT_TYPES = ["Bus", "Train", "Tram", "Subway"];

export function QuickAddTripModal({ visible, onClose, onSubmit }: QuickAddTripModalProps) {
	const [date, setDate] = useState(new Date());
	const [origin, setOrigin] = useState("");
	const [destination, setDestination] = useState("");
	const [transportType, setTransportType] = useState(TRANSPORT_TYPES[0]);
	const [cost, setCost] = useState("");
	const [description, setDescription] = useState("");
	const [distance, setDistance] = useState("");
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [showTransportPicker, setShowTransportPicker] = useState(false);

	const [connections, setConnections] = useState<OebbJourney[]>([]);
	const [loadingConnections, setLoadingConnections] = useState(false);
	const [connectionError, setConnectionError] = useState("");
	const [showConnections, setShowConnections] = useState(false);
	const [selectedConnectionIndex, setSelectedConnectionIndex] = useState<number | null>(null);

	const canSearch = origin.trim().length > 0 && destination.trim().length > 0;

	const handleSearchOebb = async () => {
		setLoadingConnections(true);
		setConnectionError("");
		setShowConnections(false);
		setSelectedConnectionIndex(null);
		try {
			const results = await searchConnections(origin.trim(), destination.trim(), new Date(), 5);
			setConnections(results);
			setShowConnections(true);
		} catch (e: any) {
			setConnectionError(e.message ?? "Search failed");
		} finally {
			setLoadingConnections(false);
		}
	};

	const handleSelectConnection = (journey: OebbJourney, index: number) => {
		const summary = summariseJourney(journey);
		setDate(summary.dep);
		setTransportType(mapTransportType(journey));
		if (summary.price?.amount !== undefined) {
			setCost(String(summary.price.amount));
		}
		setSelectedConnectionIndex(index);
		setShowConnections(false);
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
		setTransportType(TRANSPORT_TYPES[0]);
		setCost("");
		setDescription("");
		setDistance("");
		setConnections([]);
		setShowConnections(false);
		setSelectedConnectionIndex(null);
		setConnectionError("");
		onClose();
	};

	const handleDateChange = (selectedDate: Date) => {
		setDate(selectedDate);
		setShowDatePicker(false);
	};

	const renderDatePicker = () => {
		if (!showDatePicker) return null;

		const today = new Date();
		const dates: Date[] = [];
		for (let i = 0; i < 7; i++) {
			const newDate = new Date(today);
			newDate.setDate(today.getDate() - i);
			dates.push(newDate);
		}

		return (
			<Modal
				visible={showDatePicker}
				transparent
				animationType="slide"
				onRequestClose={() => setShowDatePicker(false)}
			>
				<View style={styles.datePickerOverlay}>
					<ThemedView style={styles.datePickerContent}>
						<View style={styles.datePickerHeader}>
							<ThemedText type="subtitle">Select Date</ThemedText>
							<TouchableOpacity onPress={() => setShowDatePicker(false)}>
								<IconSymbol name="xmark.circle.fill" size={24} color="#666" />
							</TouchableOpacity>
						</View>
						<ScrollView style={styles.datePickerList}>
							{dates.map((d) => (
								<TouchableOpacity
									key={d.toISOString()}
									style={[
										styles.dateOption,
										d.toDateString() === date.toDateString() && styles.dateOptionSelected,
									]}
									onPress={() => handleDateChange(d)}
								>
									<ThemedText
										style={[
											styles.dateOptionText,
											d.toDateString() === date.toDateString() && styles.dateOptionTextSelected,
										]}
									>
										{d.toLocaleDateString("en-US", {
											weekday: "long",
											month: "long",
											day: "numeric",
										})}
									</ThemedText>
								</TouchableOpacity>
							))}
						</ScrollView>
					</ThemedView>
				</View>
			</Modal>
		);
	};

	const renderConnectionPicker = () => {
		if (!showConnections || connections.length === 0) return null;

		return (
			<View style={styles.connectionList}>
				<ThemedText style={styles.connectionListLabel}>Select a connection:</ThemedText>
				<ScrollView style={styles.connectionScroll} nestedScrollEnabled>
					{connections.map((journey, i) => {
						const s = summariseJourney(journey);
						const isSelected = selectedConnectionIndex === i;
						return (
							<TouchableOpacity
								key={i}
								style={[styles.connectionItem, isSelected && styles.connectionItemSelected]}
								onPress={() => handleSelectConnection(journey, i)}
							>
								<View style={styles.connectionRow}>
									<ThemedText
										style={[styles.connectionTime, isSelected && styles.connectionTimeSelected]}
									>
										{s.depLabel} → {s.arrLabel}
									</ThemedText>
									{s.price ? (
										<ThemedText
											style={[styles.connectionPrice, isSelected && styles.connectionPriceSelected]}
										>
											€{s.price.amount.toFixed(2)}
										</ThemedText>
									) : (
										<ThemedText style={styles.connectionNoPrice}>—</ThemedText>
									)}
								</View>
								<ThemedText style={styles.connectionMeta}>
									{Math.floor(s.durationMin / 60)}h {s.durationMin % 60}m
									{s.transfers > 0
										? ` · ${s.transfers} transfer${s.transfers > 1 ? "s" : ""}`
										: " · direct"}
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
		<>
			{renderDatePicker()}
			<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
				<View style={styles.modalOverlay}>
					<ThemedView style={styles.modalContent}>
						<View style={styles.header}>
							<ThemedText type="subtitle">Quick Add Trip</ThemedText>
							<TouchableOpacity onPress={onClose}>
								<IconSymbol name="xmark.circle.fill" size={24} color="#666" />
							</TouchableOpacity>
						</View>

						{/* Origin Input */}
						<View style={styles.inputContainer}>
							<IconSymbol name="mappin.circle.fill" size={20} color={Palette.blue.mid} />
							<TextInput
								style={styles.input}
								value={origin}
								onChangeText={(v) => {
									setOrigin(v);
									setShowConnections(false);
									setSelectedConnectionIndex(null);
								}}
								placeholder="Origin"
								placeholderTextColor="#666"
							/>
						</View>

						{/* Destination Input */}
						<View style={styles.inputContainer}>
							<IconSymbol name="mappin.circle.fill" size={20} color={Palette.blue.mid} />
							<TextInput
								style={styles.input}
								value={destination}
								onChangeText={(v) => {
									setDestination(v);
									setShowConnections(false);
									setSelectedConnectionIndex(null);
								}}
								placeholder="Destination"
								placeholderTextColor="#666"
							/>
						</View>

						{/* OeBB Search */}
						{canSearch && (
							<TouchableOpacity
								style={[styles.searchButton, loadingConnections && styles.searchButtonDisabled]}
								onPress={handleSearchOebb}
								disabled={loadingConnections}
							>
								{loadingConnections ? (
									<ActivityIndicator size="small" color="#fff" />
								) : (
									<IconSymbol name="magnifyingglass" size={16} color="#fff" />
								)}
								<ThemedText style={styles.searchButtonText}>
									{loadingConnections ? "Searching…" : "Find Connections"}
								</ThemedText>
							</TouchableOpacity>
						)}

						{connectionError ? (
							<ThemedText style={styles.errorText}>{connectionError}</ThemedText>
						) : null}

						{renderConnectionPicker()}

						{/* Date Picker Button */}
						<TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
							<IconSymbol name="calendar" size={20} color={Palette.blue.mid} />
							<ThemedText style={styles.dateButtonText}>
								{date.toLocaleDateString("en-US", {
									weekday: "long",
									month: "long",
									day: "numeric",
								})}
							</ThemedText>
						</TouchableOpacity>

						{/* Transport Type Picker */}
						<TouchableOpacity
							style={styles.dateButton}
							onPress={() => setShowTransportPicker(true)}
						>
							<IconSymbol name="bus" size={20} color={Palette.blue.mid} />
							<ThemedText style={styles.dateButtonText}>{transportType}</ThemedText>
						</TouchableOpacity>

						{showTransportPicker && (
							<View style={styles.transportPicker}>
								{TRANSPORT_TYPES.map((type) => (
									<TouchableOpacity
										key={type}
										style={[
											styles.transportOption,
											transportType === type && styles.transportOptionSelected,
										]}
										onPress={() => {
											setTransportType(type);
											setShowTransportPicker(false);
										}}
									>
										<ThemedText
											style={[
												styles.transportOptionText,
												transportType === type && styles.transportOptionTextSelected,
											]}
										>
											{type}
										</ThemedText>
									</TouchableOpacity>
								))}
							</View>
						)}

						{/* Cost Input */}
						<View style={styles.inputContainer}>
							<IconSymbol name="eurosign.circle.fill" size={20} color={Palette.blue.mid} />
							<TextInput
								style={styles.input}
								value={cost}
								onChangeText={setCost}
								placeholder="Equivalent ticket price (€)"
								keyboardType="decimal-pad"
								placeholderTextColor="#666"
							/>
						</View>

						{/* Distance Input */}
						<View style={styles.inputContainer}>
							<IconSymbol name="ruler" size={20} color={Palette.blue.mid} />
							<TextInput
								style={styles.input}
								value={distance}
								onChangeText={setDistance}
								placeholder="Distance (km)"
								keyboardType="numeric"
								placeholderTextColor="#666"
							/>
						</View>

						{/* Description Input */}
						<View style={styles.inputContainer}>
							<IconSymbol name="text.bubble" size={20} color={Palette.blue.mid} />
							<TextInput
								style={styles.input}
								value={description}
								onChangeText={setDescription}
								placeholder="Description (optional)"
								placeholderTextColor="#666"
							/>
						</View>

						{/* Submit Button */}
						<TouchableOpacity
							style={[
								styles.submitButton,
								(!origin || !destination || !cost || !distance) && styles.submitButtonDisabled,
							]}
							onPress={handleSubmit}
							disabled={!origin || !destination || !cost || !distance}
						>
							<ThemedText style={styles.submitButtonText}>Add Trip</ThemedText>
						</TouchableOpacity>
					</ThemedView>
				</View>
			</Modal>
		</>
	);
}

const styles = StyleSheet.create({
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "center",
		alignItems: "center",
	},
	modalContent: {
		width: "90%",
		maxWidth: 400,
		backgroundColor: Palette.blue.dark,
		borderRadius: 12,
		padding: 20,
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
		marginBottom: 20,
	},
	searchButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
		backgroundColor: Palette.blue.mid,
		padding: 10,
		borderRadius: 8,
		marginBottom: 12,
	},
	searchButtonDisabled: {
		opacity: 0.6,
	},
	searchButtonText: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "600",
	},
	errorText: {
		color: Palette.red.mid,
		fontSize: 13,
		marginBottom: 10,
		textAlign: "center",
	},
	connectionList: {
		marginBottom: 12,
		borderWidth: 1,
		borderColor: Palette.blue.light,
		borderRadius: 8,
		overflow: "hidden",
	},
	connectionListLabel: {
		fontSize: 12,
		color: "#666",
		paddingHorizontal: 12,
		paddingTop: 8,
		paddingBottom: 4,
	},
	connectionScroll: {
		maxHeight: 220,
	},
	connectionItem: {
		padding: 12,
		borderTopWidth: 1,
		borderTopColor: "#eee",
	},
	connectionItemSelected: {
		backgroundColor: Palette.blue.dark,
	},
	connectionRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 2,
	},
	connectionTime: {
		fontSize: 15,
		fontWeight: "600",
		color: "#111",
	},
	connectionTimeSelected: {
		color: "#fff",
	},
	connectionPrice: {
		fontSize: 14,
		fontWeight: "700",
		color: Palette.green.dark,
	},
	connectionPriceSelected: {
		color: Palette.green.light,
	},
	connectionNoPrice: {
		fontSize: 14,
		color: "#aaa",
	},
	connectionMeta: {
		fontSize: 12,
		color: "#666",
	},
	dateButton: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#f5f5f5",
		padding: 12,
		borderRadius: 8,
		marginBottom: 16,
	},
	dateButtonText: {
		marginLeft: 8,
		fontSize: 16,
		color: Palette.blue.mid,
	},
	inputContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#f5f5f5",
		padding: 12,
		borderRadius: 8,
		marginBottom: 16,
	},
	input: {
		flex: 1,
		marginLeft: 8,
		fontSize: 16,
		color: "#000",
	},
	submitButton: {
		backgroundColor: Palette.green.mid,
		padding: 12,
		borderRadius: 8,
		alignItems: "center",
		marginTop: 8,
	},
	submitButtonDisabled: {
		backgroundColor: "#ccc",
	},
	submitButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
	transportPicker: {
		backgroundColor: "#fff",
		borderRadius: 8,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: "#eee",
	},
	transportOption: {
		padding: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#eee",
	},
	transportOptionSelected: {
		backgroundColor: Palette.blue.mid,
	},
	transportOptionText: {
		color: Palette.green.mid,
		fontSize: 16,
	},
	transportOptionTextSelected: {
		color: Palette.white,
		fontWeight: "600",
	},
	datePickerOverlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "center",
		alignItems: "center",
	},
	datePickerContent: {
		width: "90%",
		maxWidth: 400,
		backgroundColor: "#fff",
		borderRadius: 12,
		padding: 20,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 4,
		elevation: 5,
	},
	datePickerHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 20,
	},
	datePickerList: {
		maxHeight: 300,
	},
	dateOption: {
		color: Palette.green.mid,
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: "#eee",
	},
	dateOptionSelected: {
		backgroundColor: Palette.blue.mid,
	},
	dateOptionText: {
		color: Palette.green.mid,
		fontSize: 16,
	},
	dateOptionTextSelected: {
		color: Palette.white,
		fontWeight: "600",
	},
});
