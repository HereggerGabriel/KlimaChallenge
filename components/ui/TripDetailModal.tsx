import React, { useState, useEffect } from "react";
import {
	Modal,
	View,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	TextInput,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Palette } from "@/constants/Colors";
import { Trip } from "@/types/trip";
import { getXPForTrip } from "@/utils/levelSystem";
import { TripRouteFields } from "@/components/ui/TripRouteFields";

const TRANSPORT_TYPES = ["Bus", "Train", "Tram", "Subway"];

type TripDetailModalProps = {
	visible: boolean;
	trip: Trip | null;
	onClose: () => void;
	onDelete: (tripId: string) => void;
	onEdit: (tripId: string, updates: Partial<Trip>) => void;
	recentPlaces?: string[];
};

function DetailRow({
	icon,
	label,
	value,
	valueColor,
}: {
	icon: keyof typeof MaterialIcons.glyphMap;
	label: string;
	value: string;
	valueColor?: string;
}) {
	return (
		<View style={styles.detailRow}>
			<MaterialIcons name={icon} size={18} color={Palette.blue.light} />
			<ThemedText style={styles.detailLabel}>{label}</ThemedText>
			<ThemedText style={[styles.detailValue, valueColor ? { color: valueColor } : undefined]}>
				{value}
			</ThemedText>
		</View>
	);
}

export function TripDetailModal({ visible, trip, onClose, onDelete, onEdit, recentPlaces = [] }: TripDetailModalProps) {
	const [showConfirm, setShowConfirm] = useState(false);
	const [mode, setMode] = useState<"view" | "edit">("view");

	// Edit form state
	const [editOrigin, setEditOrigin] = useState("");
	const [editDestination, setEditDestination] = useState("");
	const [editTransportType, setEditTransportType] = useState(TRANSPORT_TYPES[0]);
	const [editCost, setEditCost] = useState("");
	const [editDistance, setEditDistance] = useState("");
	const [editDescription, setEditDescription] = useState("");
	const [editDate, setEditDate] = useState(new Date());
	const [editHour, setEditHour] = useState("00");
	const [editMinute, setEditMinute] = useState("00");
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [showTransportPicker, setShowTransportPicker] = useState(false);

	// Populate form when entering edit mode
	useEffect(() => {
		if (trip && mode === "edit") {
			const d = trip.date instanceof Date ? trip.date : new Date(trip.date);
			setEditOrigin(trip.origin);
			setEditDestination(trip.destination);
			setEditTransportType(trip.transportType);
			setEditCost(trip.cost.toString());
			setEditDistance(trip.distance.toString());
			setEditDescription(trip.description ?? "");
			setEditDate(d);
			setEditHour(d.getHours().toString().padStart(2, "0"));
			setEditMinute(d.getMinutes().toString().padStart(2, "0"));
			setShowDatePicker(false);
			setShowTransportPicker(false);
		}
	}, [mode, trip]);

	// Reset to view mode when modal closes
	useEffect(() => {
		if (!visible) {
			setMode("view");
			setShowConfirm(false);
		}
	}, [visible]);

	if (!trip) return null;

	const d = trip.date instanceof Date ? trip.date : new Date(trip.date);
	const dateStr = d.toLocaleDateString("en-AT", {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
	});
	const timeStr = d.toLocaleTimeString("en-AT", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
	const xpEarned = getXPForTrip(trip.distance, trip.transportType);

	const handleSaveEdit = () => {
		const cost = parseFloat(editCost);
		const distance = parseFloat(editDistance);
		if (!editOrigin || !editDestination || isNaN(cost) || isNaN(distance)) return;
		const finalDate = new Date(editDate);
		finalDate.setHours(
			Math.min(23, Math.max(0, parseInt(editHour) || 0)),
			Math.min(59, Math.max(0, parseInt(editMinute) || 0)),
			0, 0,
		);
		onEdit(trip.id, {
			origin: editOrigin.trim(),
			destination: editDestination.trim(),
			transportType: editTransportType,
			cost,
			distance,
			description: editDescription.trim(),
			date: finalDate,
		});
		setMode("view");
	};

	const dateOptions: Date[] = Array.from({ length: 7 }, (_, i) => {
		const day = new Date();
		day.setDate(day.getDate() - i);
		return day;
	});

	return (
		<Modal
			visible={visible}
			transparent
			animationType="slide"
			onRequestClose={() => {
				if (showConfirm) { setShowConfirm(false); return; }
				if (mode === "edit") { setMode("view"); return; }
				onClose();
			}}
		>
			<View style={styles.overlay}>
				<View style={styles.card}>

					{/* Header */}
					<View style={styles.header}>
						<View style={styles.headerText}>
							<ThemedText style={styles.route} numberOfLines={1}>
								{mode === "edit" ? "Edit Trip" : `${trip.origin} → ${trip.destination}`}
							</ThemedText>
						</View>
						<View style={styles.headerActions}>
							{mode === "view" ? (
								<>
									<TouchableOpacity
										onPress={() => setMode("edit")}
										hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
									>
										<MaterialIcons name="edit" size={22} color={Palette.blue.light} />
									</TouchableOpacity>
									<TouchableOpacity
										onPress={() => setShowConfirm(true)}
										hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
									>
										<MaterialIcons name="delete-outline" size={24} color={Palette.red.light} />
									</TouchableOpacity>
									<TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
										<MaterialIcons name="close" size={26} color={Palette.blue.light} />
									</TouchableOpacity>
								</>
							) : (
								<>
									<TouchableOpacity
										onPress={() => setMode("view")}
										hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
									>
										<MaterialIcons name="close" size={24} color="rgba(255,255,255,0.5)" />
									</TouchableOpacity>
									<TouchableOpacity
										onPress={handleSaveEdit}
										hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
									>
										<MaterialIcons name="check" size={26} color={Palette.green.mid} />
									</TouchableOpacity>
								</>
							)}
						</View>
					</View>

					{mode === "view" ? (
						<>
							{/* XP badge */}
							<View style={styles.xpBadge}>
								<MaterialIcons name="star" size={13} color={Palette.green.light} />
								<ThemedText style={styles.xpBadgeText}>+{xpEarned} XP</ThemedText>
							</View>

							<View style={styles.divider} />

							<ScrollView showsVerticalScrollIndicator={false}>
								<DetailRow icon="calendar-today" label="Date" value={dateStr} />
								<DetailRow icon="access-time" label="Time" value={timeStr} />
								<DetailRow icon="directions-bus" label="Transport" value={trip.transportType} />
								<DetailRow
									icon="euro"
									label="Cost"
									value={`€${trip.cost.toFixed(2)}`}
									valueColor={Palette.green.mid}
								/>
								<DetailRow icon="straighten" label="Distance" value={`${trip.distance} km`} />
								{trip.description ? (
									<DetailRow icon="chat-bubble-outline" label="Note" value={trip.description} />
								) : null}
							</ScrollView>

							<TouchableOpacity style={styles.closeButton} onPress={onClose}>
								<ThemedText style={styles.closeButtonText}>Close</ThemedText>
							</TouchableOpacity>
						</>
					) : (
						<ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
							<View style={styles.divider} />

							{/* Origin / Destination / Cost / Distance */}
							<TripRouteFields
								origin={editOrigin}
								onOriginChange={setEditOrigin}
								destination={editDestination}
								onDestinationChange={setEditDestination}
								cost={editCost}
								onCostChange={setEditCost}
								distance={editDistance}
								onDistanceChange={setEditDistance}
								transportType={editTransportType}
								recentPlaces={recentPlaces}
								theme="dark"
							/>

							{/* Transport type */}
							<ThemedText style={styles.fieldLabel}>Transport</ThemedText>
							<TouchableOpacity
								style={styles.editInput}
								onPress={() => setShowTransportPicker((v) => !v)}
							>
								<ThemedText style={styles.editInputText}>{editTransportType}</ThemedText>
							</TouchableOpacity>
							{showTransportPicker && (
								<View style={styles.pickerList}>
									{TRANSPORT_TYPES.map((type) => (
										<TouchableOpacity
											key={type}
											style={[
												styles.pickerOption,
												editTransportType === type && styles.pickerOptionSelected,
											]}
											onPress={() => {
												setEditTransportType(type);
												setShowTransportPicker(false);
											}}
										>
											<ThemedText
												style={[
													styles.pickerOptionText,
													editTransportType === type && styles.pickerOptionTextSelected,
												]}
											>
												{type}
											</ThemedText>
										</TouchableOpacity>
									))}
								</View>
							)}

							{/* Date */}
							<ThemedText style={styles.fieldLabel}>Date</ThemedText>
							<TouchableOpacity
								style={styles.editInput}
								onPress={() => setShowDatePicker((v) => !v)}
							>
								<ThemedText style={styles.editInputText}>
									{editDate.toLocaleDateString("en-AT", {
										weekday: "short",
										day: "numeric",
										month: "short",
									})}
								</ThemedText>
							</TouchableOpacity>
							{showDatePicker && (
								<View style={styles.pickerList}>
									{dateOptions.map((day) => (
										<TouchableOpacity
											key={day.toISOString()}
											style={[
												styles.pickerOption,
												day.toDateString() === editDate.toDateString() &&
													styles.pickerOptionSelected,
											]}
											onPress={() => {
												setEditDate(day);
												setShowDatePicker(false);
											}}
										>
											<ThemedText
												style={[
													styles.pickerOptionText,
													day.toDateString() === editDate.toDateString() &&
														styles.pickerOptionTextSelected,
												]}
											>
												{day.toLocaleDateString("en-AT", {
													weekday: "long",
													day: "numeric",
													month: "long",
												})}
											</ThemedText>
										</TouchableOpacity>
									))}
								</View>
							)}

							{/* Time */}
							<ThemedText style={styles.fieldLabel}>Time</ThemedText>
							<View style={styles.timeRow}>
								<TextInput
									style={[styles.editInput, styles.timeInput]}
									value={editHour}
									onChangeText={(v) => setEditHour(v.replace(/\D/g, "").slice(0, 2))}
									keyboardType="number-pad"
									placeholder="HH"
									placeholderTextColor="rgba(255,255,255,0.3)"
									maxLength={2}
								/>
								<ThemedText style={styles.timeSeparator}>:</ThemedText>
								<TextInput
									style={[styles.editInput, styles.timeInput]}
									value={editMinute}
									onChangeText={(v) => setEditMinute(v.replace(/\D/g, "").slice(0, 2))}
									keyboardType="number-pad"
									placeholder="MM"
									placeholderTextColor="rgba(255,255,255,0.3)"
									maxLength={2}
								/>
							</View>

							{/* Description */}
							<ThemedText style={styles.fieldLabel}>Note (optional)</ThemedText>
							<TextInput
								style={styles.editInput}
								value={editDescription}
								onChangeText={setEditDescription}
								placeholder="Add a note…"
								placeholderTextColor="rgba(255,255,255,0.3)"
							/>

							{/* Save button */}
							<TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit}>
								<ThemedText style={styles.saveButtonText}>Save Changes</ThemedText>
							</TouchableOpacity>

							<TouchableOpacity
								style={styles.cancelEditButton}
								onPress={() => setMode("view")}
							>
								<ThemedText style={styles.cancelEditButtonText}>Cancel</ThemedText>
							</TouchableOpacity>
						</ScrollView>
					)}

					{/* Confirm delete overlay */}
					{showConfirm && (
						<View style={styles.confirmOverlay}>
							<View style={styles.confirmBox}>
								<MaterialIcons
									name="delete-outline"
									size={32}
									color={Palette.red.light}
									style={styles.confirmIcon}
								/>
								<ThemedText style={styles.confirmTitle}>Remove Trip?</ThemedText>
								<ThemedText style={styles.confirmBody}>
									{trip.origin} → {trip.destination}
								</ThemedText>
								<ThemedText style={styles.confirmSub}>
									This will also deduct {xpEarned} XP.
								</ThemedText>
								<View style={styles.confirmButtons}>
									<TouchableOpacity
										style={styles.confirmCancel}
										onPress={() => setShowConfirm(false)}
									>
										<ThemedText style={styles.confirmCancelText}>Cancel</ThemedText>
									</TouchableOpacity>
									<TouchableOpacity
										style={styles.confirmDelete}
										onPress={() => {
											setShowConfirm(false);
											onDelete(trip.id);
											onClose();
										}}
									>
										<ThemedText style={styles.confirmDeleteText}>Remove</ThemedText>
									</TouchableOpacity>
								</View>
							</View>
						</View>
					)}
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.55)",
		justifyContent: "center",
		alignItems: "center",
	},
	card: {
		width: "88%",
		maxWidth: 400,
		maxHeight: "88%",
		backgroundColor: Palette.blue.dark,
		borderRadius: 16,
		padding: 22,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.12)",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.4,
		shadowRadius: 8,
		elevation: 8,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 10,
	},
	headerText: {
		flex: 1,
		marginRight: 12,
	},
	headerActions: {
		flexDirection: "row",
		alignItems: "center",
		gap: 14,
	},
	route: {
		fontSize: 18,
		fontWeight: "700",
		color: "#fff",
	},
	xpBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		alignSelf: "flex-start",
		backgroundColor: "rgba(63,178,143,0.18)",
		borderRadius: 10,
		paddingHorizontal: 10,
		paddingVertical: 4,
		marginBottom: 14,
	},
	xpBadgeText: {
		fontSize: 13,
		fontWeight: "600",
		color: Palette.green.light,
	},
	divider: {
		height: 1,
		backgroundColor: "rgba(255,255,255,0.1)",
		marginBottom: 14,
	},
	detailRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: "rgba(255,255,255,0.06)",
	},
	detailLabel: {
		fontSize: 13,
		color: "rgba(255,255,255,0.5)",
		width: 72,
	},
	detailValue: {
		flex: 1,
		fontSize: 15,
		fontWeight: "500",
		color: "#fff",
		textAlign: "right",
	},
	closeButton: {
		marginTop: 18,
		backgroundColor: Palette.blue.mid,
		borderRadius: 10,
		paddingVertical: 12,
		alignItems: "center",
	},
	closeButtonText: {
		color: "#fff",
		fontSize: 15,
		fontWeight: "600",
	},
	// Edit form
	fieldLabel: {
		fontSize: 11,
		fontWeight: "600",
		color: "rgba(255,255,255,0.5)",
		letterSpacing: 0.8,
		textTransform: "uppercase",
		marginBottom: 6,
		marginTop: 14,
	},
	editInput: {
		backgroundColor: "rgba(255,255,255,0.08)",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.15)",
		borderRadius: 10,
		paddingHorizontal: 14,
		paddingVertical: 11,
		color: "#fff",
		fontSize: 15,
	},
	editInputText: {
		color: "#fff",
		fontSize: 15,
	},
	pickerList: {
		marginTop: 4,
		borderRadius: 10,
		overflow: "hidden",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.12)",
	},
	pickerOption: {
		paddingVertical: 11,
		paddingHorizontal: 14,
		borderBottomWidth: 1,
		borderBottomColor: "rgba(255,255,255,0.06)",
	},
	pickerOptionSelected: {
		backgroundColor: Palette.blue.mid,
	},
	pickerOptionText: {
		color: "rgba(255,255,255,0.7)",
		fontSize: 15,
	},
	pickerOptionTextSelected: {
		color: "#fff",
		fontWeight: "600",
	},
	saveButton: {
		marginTop: 20,
		backgroundColor: Palette.green.mid,
		borderRadius: 10,
		paddingVertical: 13,
		alignItems: "center",
		shadowColor: Palette.green.mid,
		shadowOpacity: 0.3,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 3 },
		elevation: 4,
	},
	saveButtonText: {
		color: "#fff",
		fontSize: 15,
		fontWeight: "700",
	},
	timeRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	timeInput: {
		flex: 1,
		textAlign: "center",
	},
	timeSeparator: {
		fontSize: 20,
		fontWeight: "700",
		color: "#fff",
	},
	cancelEditButton: {
		marginTop: 10,
		marginBottom: 8,
		borderRadius: 10,
		paddingVertical: 12,
		alignItems: "center",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.15)",
	},
	cancelEditButtonText: {
		color: "rgba(255,255,255,0.6)",
		fontSize: 15,
		fontWeight: "500",
	},
	// Confirm overlay
	confirmOverlay: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: "rgba(0,20,36,0.92)",
		borderRadius: 16,
		justifyContent: "center",
		alignItems: "center",
		padding: 24,
	},
	confirmBox: {
		width: "100%",
		alignItems: "center",
	},
	confirmIcon: {
		marginBottom: 10,
	},
	confirmTitle: {
		fontSize: 18,
		fontWeight: "700",
		color: "#fff",
		marginBottom: 6,
	},
	confirmBody: {
		fontSize: 15,
		color: "rgba(255,255,255,0.75)",
		marginBottom: 4,
		textAlign: "center",
	},
	confirmSub: {
		fontSize: 12,
		color: Palette.red.light,
		marginBottom: 24,
		textAlign: "center",
	},
	confirmButtons: {
		flexDirection: "row",
		gap: 12,
		width: "100%",
	},
	confirmCancel: {
		flex: 1,
		paddingVertical: 12,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.2)",
		alignItems: "center",
	},
	confirmCancelText: {
		color: "rgba(255,255,255,0.75)",
		fontSize: 15,
		fontWeight: "600",
	},
	confirmDelete: {
		flex: 1,
		paddingVertical: 12,
		borderRadius: 10,
		backgroundColor: Palette.red.dark,
		alignItems: "center",
	},
	confirmDeleteText: {
		color: "#fff",
		fontSize: 15,
		fontWeight: "700",
	},
});
