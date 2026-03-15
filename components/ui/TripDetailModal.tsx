import React, { useState } from "react";
import { Modal, View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Palette } from "@/constants/Colors";
import { Trip } from "@/types/trip";
import { getXPForTrip } from "@/utils/levelSystem";

type TripDetailModalProps = {
	visible: boolean;
	trip: Trip | null;
	onClose: () => void;
	onDelete: (tripId: string) => void;
};

function DetailRow({
	icon,
	label,
	value,
	valueColor,
}: {
	icon: string;
	label: string;
	value: string;
	valueColor?: string;
}) {
	return (
		<View style={styles.detailRow}>
			<IconSymbol name={icon as any} size={18} color={Palette.blue.light} />
			<ThemedText style={styles.detailLabel}>{label}</ThemedText>
			<ThemedText style={[styles.detailValue, valueColor ? { color: valueColor } : undefined]}>
				{value}
			</ThemedText>
		</View>
	);
}

export function TripDetailModal({ visible, trip, onClose, onDelete }: TripDetailModalProps) {
	const [showConfirm, setShowConfirm] = useState(false);

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

	return (
		<Modal
			visible={visible}
			transparent
			animationType="slide"
			onRequestClose={() => {
				if (showConfirm) setShowConfirm(false);
				else onClose();
			}}
		>
			<View style={styles.overlay}>
				<View style={styles.card}>
					{/* Header */}
					<View style={styles.header}>
						<View style={styles.headerText}>
							<ThemedText style={styles.route}>
								{trip.origin} → {trip.destination}
							</ThemedText>
						</View>
						<View style={styles.headerActions}>
							<TouchableOpacity
								onPress={() => setShowConfirm(true)}
								hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
							>
								<MaterialIcons name="delete-outline" size={24} color={Palette.red.light} />
							</TouchableOpacity>
							<TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
								<MaterialIcons name="close" size={26} color={Palette.blue.light} />
							</TouchableOpacity>
						</View>
					</View>

					{/* XP badge */}
					<View style={styles.xpBadge}>
						<IconSymbol name="star.fill" size={13} color={Palette.green.light} />
						<ThemedText style={styles.xpBadgeText}>+{xpEarned} XP</ThemedText>
					</View>

					<View style={styles.divider} />

					{/* Details */}
					<ScrollView showsVerticalScrollIndicator={false}>
						<DetailRow icon="calendar" label="Date" value={dateStr} />
						<DetailRow icon="clock" label="Time" value={timeStr} />
						<DetailRow icon="bus" label="Transport" value={trip.transportType} />
						<DetailRow
							icon="eurosign.circle.fill"
							label="Cost"
							value={`€${trip.cost.toFixed(2)}`}
							valueColor={Palette.green.mid}
						/>
						<DetailRow icon="ruler" label="Distance" value={`${trip.distance} km`} />
						{trip.description ? (
							<DetailRow icon="text.bubble" label="Note" value={trip.description} />
						) : null}
					</ScrollView>

					<TouchableOpacity style={styles.closeButton} onPress={onClose}>
						<ThemedText style={styles.closeButtonText}>Close</ThemedText>
					</TouchableOpacity>

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
	// Confirm overlay
	confirmOverlay: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: "rgba(0,20,36,0.82)",
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
