import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import Svg, { Circle } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { Palette } from "@/constants/Colors";

interface FinancialOverviewProps {
	totalTrips: number;
	totalDistance: number;
	totalCost: number;
	klimaTicketCost: number;
}

const CIRCLE_SIZE = 200;
const CIRCLE_STROKE_WIDTH = 20;
const CIRCLE_RADIUS = (CIRCLE_SIZE - CIRCLE_STROKE_WIDTH) / 2;
const CIRCLE_CENTER = CIRCLE_SIZE / 2;

export function FinancialOverview({
	totalTrips,
	totalDistance,
	totalCost,
	klimaTicketCost,
}: FinancialOverviewProps) {
	const [expanded, setExpanded] = useState(false);

	const savings = totalCost;
	const savingsPercentage = ((savings / klimaTicketCost) * 100).toFixed(1);
	const remainingToBreakEven = Math.max(0, klimaTicketCost - savings);
	const percentage = Math.min((savings / klimaTicketCost) * 100, 100);
	const tripsNeeded = Math.ceil(remainingToBreakEven / 2.5);

	const circumference = 2 * Math.PI * CIRCLE_RADIUS;
	const progressOffset = circumference - (percentage / 100) * circumference;

	return (
		<LinearGradient
			colors={[Palette.blue.mid, Palette.blue.dark]}
			start={{ x: 1, y: 0 }}
			end={{ x: 1, y: 1 }}
			style={styles.container}
		>
			{/* Header row */}
			<TouchableOpacity style={styles.headerRow} onPress={() => setExpanded((v) => !v)} activeOpacity={0.75}>
				<ThemedText style={styles.title}>Financial Overview</ThemedText>
				<IconSymbol
					name={expanded ? "chevron.up" : "chevron.down"}
					size={16}
					color="rgba(255,255,255,0.5)"
				/>
			</TouchableOpacity>

			{/* Always visible: key summary rows */}
			<View style={styles.summaryRow}>
				<ThemedText style={styles.summaryLabel}>Ticket Value Used</ThemedText>
				<ThemedText style={styles.summaryValue}>
					€{savings.toFixed(2)}
					<ThemedText style={styles.summaryPercent}> ({savingsPercentage}%)</ThemedText>
				</ThemedText>
			</View>

			<View style={styles.summaryRow}>
				<ThemedText style={styles.summaryLabel}>To Break Even</ThemedText>
				<ThemedText style={[styles.summaryValue, remainingToBreakEven === 0 && styles.summaryValueDone]}>
					{remainingToBreakEven === 0 ? "Paid off! 🎉" : `€${remainingToBreakEven.toFixed(2)} left`}
				</ThemedText>
			</View>

			{/* Expand hint */}
			<TouchableOpacity style={styles.expandHint} onPress={() => setExpanded((v) => !v)} activeOpacity={0.65}>
				<View style={styles.expandHintLine} />
				<ThemedText style={styles.expandHintText}>
					{expanded ? "Hide details" : "Show details"}
				</ThemedText>
				<IconSymbol
					name={expanded ? "chevron.up" : "chevron.down"}
					size={12}
					color={Palette.blue.light}
				/>
				<View style={styles.expandHintLine} />
			</TouchableOpacity>

			{/* Expandable details */}
			{expanded && (
				<>
					<View style={styles.divider} />

					<View style={styles.row}>
						<ThemedText style={styles.label}>Total Trips</ThemedText>
						<ThemedText style={styles.value}>{totalTrips}</ThemedText>
					</View>

					<View style={styles.row}>
						<ThemedText style={styles.label}>Total Distance</ThemedText>
						<ThemedText style={styles.value}>{totalDistance} km</ThemedText>
					</View>

					<View style={styles.row}>
						<ThemedText style={styles.label}>Equivalent Ticket Value</ThemedText>
						<ThemedText style={styles.value}>€{totalCost.toFixed(2)}</ThemedText>
					</View>

					<View style={styles.row}>
						<ThemedText style={styles.label}>KlimaTicket Cost</ThemedText>
						<ThemedText style={styles.value}>€{klimaTicketCost.toFixed(2)}</ThemedText>
					</View>

					{/* Donut */}
					<View style={styles.progressContainer}>
						<Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
							<Circle
								cx={CIRCLE_CENTER}
								cy={CIRCLE_CENTER}
								r={CIRCLE_RADIUS}
								stroke="rgba(255,255,255,0.15)"
								strokeWidth={CIRCLE_STROKE_WIDTH}
							/>
							<Circle
								cx={CIRCLE_CENTER}
								cy={CIRCLE_CENTER}
								r={CIRCLE_RADIUS}
								stroke={Palette.green.mid}
								strokeWidth={CIRCLE_STROKE_WIDTH}
								strokeDasharray={circumference}
								strokeDashoffset={progressOffset}
								strokeLinecap="round"
								transform={`rotate(-90 ${CIRCLE_CENTER} ${CIRCLE_CENTER})`}
							/>
						</Svg>
						<View style={styles.progressText}>
							<ThemedText type="title" style={styles.percentageText}>
								{Math.round(percentage)}%
							</ThemedText>
							<ThemedText style={styles.progressSubtext}>of KlimaTicket</ThemedText>
						</View>
					</View>

					{/* Stats bar */}
					<View style={styles.statsContainer}>
						<View style={styles.statItem}>
							<IconSymbol name="eurosign.circle.fill" size={24} color="#fff" />
							<ThemedText style={styles.statValue}>€{totalCost.toFixed(2)}</ThemedText>
							<ThemedText style={styles.statLabel}>Ticket Value</ThemedText>
						</View>
						<View style={styles.statItem}>
							<IconSymbol name="bus" size={24} color="#fff" />
							<ThemedText style={styles.statValue}>{totalTrips}</ThemedText>
							<ThemedText style={styles.statLabel}>Total Trips</ThemedText>
						</View>
						<View style={styles.statItem}>
							<IconSymbol name="arrow.up.circle.fill" size={24} color="#fff" />
							<ThemedText style={styles.statValue}>€{remainingToBreakEven.toFixed(2)}</ThemedText>
							<ThemedText style={styles.statLabel}>To Break Even</ThemedText>
						</View>
					</View>

					{/* Info footer */}
					<View style={styles.infoContainer}>
						<ThemedText style={styles.infoText}>
							{tripsNeeded > 0
								? `${tripsNeeded} more trips needed to break even`
								: "KlimaTicket has paid off!"}
						</ThemedText>
						<ThemedText style={styles.timeFrameText}>
							Based on {totalTrips} trips covering {totalDistance} km
						</ThemedText>
					</View>
				</>
			)}
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	container: {
		padding: 20,
		borderRadius: 16,
		marginBottom: 20,
	},
	headerRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 14,
	},
	title: {
		color: "#fff",
		fontSize: 18,
		fontWeight: "700",
	},
	summaryRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 10,
	},
	summaryLabel: {
		color: "rgba(255,255,255,0.7)",
		fontSize: 15,
		fontWeight: "500",
	},
	summaryValue: {
		color: Palette.green.light,
		fontSize: 15,
		fontWeight: "700",
	},
	summaryPercent: {
		color: "rgba(255,255,255,0.55)",
		fontSize: 13,
		fontWeight: "400",
	},
	summaryValueDone: {
		color: Palette.green.mid,
	},
	expandHint: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
		marginTop: 12,
	},
	expandHintLine: {
		flex: 1,
		height: 1,
		backgroundColor: "rgba(255,255,255,0.12)",
	},
	expandHintText: {
		fontSize: 12,
		color: Palette.blue.light,
		fontWeight: "500",
	},
	divider: {
		height: 1,
		backgroundColor: "rgba(255,255,255,0.15)",
		marginVertical: 14,
	},
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 10,
	},
	label: {
		color: "rgba(255,255,255,0.7)",
		fontSize: 14,
	},
	value: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "600",
	},
	progressContainer: {
		alignItems: "center",
		marginTop: 10,
		marginBottom: 4,
	},
	progressText: {
		position: "absolute",
		alignItems: "center",
		justifyContent: "center",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
	},
	percentageText: {
		fontSize: 36,
		fontWeight: "bold",
	},
	progressSubtext: {
		fontSize: 13,
		color: "rgba(255,255,255,0.6)",
	},
	statsContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 16,
	},
	statItem: {
		alignItems: "center",
		flex: 1,
	},
	statValue: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "600",
		marginTop: 6,
	},
	statLabel: {
		color: "rgba(255,255,255,0.6)",
		fontSize: 11,
		marginTop: 3,
	},
	infoContainer: {
		alignItems: "center",
		marginTop: 16,
	},
	infoText: {
		fontSize: 13,
		color: "rgba(255,255,255,0.6)",
		textAlign: "center",
	},
	timeFrameText: {
		fontSize: 11,
		color: "rgba(255,255,255,0.4)",
		marginTop: 4,
	},
});
