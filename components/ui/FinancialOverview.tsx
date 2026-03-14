import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
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
	const savings = totalCost; // Equivalent ticket cost saved by having the KlimaTicket
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
			<ThemedText style={styles.title}>Financial Overview</ThemedText>

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
				<ThemedText style={styles.label}>KlimaTicket K Cost</ThemedText>
				<ThemedText style={styles.value}>€{klimaTicketCost.toFixed(2)}</ThemedText>
			</View>

			<View style={styles.savingsRow}>
				<ThemedText style={styles.savingsLabel}>Ticket Value Used</ThemedText>
				<ThemedText style={styles.savingsValue}>
					€{savings.toFixed(2)} ({savingsPercentage}%)
				</ThemedText>
			</View>

			<View style={styles.breakEvenRow}>
				<ThemedText style={styles.breakEvenLabel}>To Break Even</ThemedText>
				<ThemedText style={styles.breakEvenValue}>
					€{remainingToBreakEven.toFixed(2)} remaining
				</ThemedText>
			</View>

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
					<ThemedText style={styles.progressSubtext}>of KlimaTicket K</ThemedText>
				</View>
			</View>

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
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	container: {
		padding: 20,
		borderRadius: 16,
		marginBottom: 20,
	},
	title: {
		color: "#fff",
		fontSize: 20,
		fontWeight: "bold",
		marginBottom: 16,
	},
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 12,
	},
	label: {
		color: "rgba(255, 255, 255, 0.8)",
		fontSize: 16,
	},
	value: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
	savingsRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: 12,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: "rgba(255, 255, 255, 0.2)",
	},
	savingsLabel: {
		color: "#fff",
		fontSize: 18,
		fontWeight: "bold",
	},
	savingsValue: {
		color: Palette.green.light,
		fontSize: 18,
		fontWeight: "bold",
	},
	breakEvenRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: 8,
		paddingTop: 8,
		borderTopWidth: 1,
		borderTopColor: "rgba(255, 255, 255, 0.2)",
	},
	breakEvenLabel: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
	breakEvenValue: {
		color: Palette.red.light,
		fontSize: 16,
		fontWeight: "600",
	},
	progressContainer: {
		alignItems: "center",
		marginBottom: 20,
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
		fontSize: 14,
		color: "rgba(255,255,255,0.6)",
	},
	statsContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 20,
	},
	statItem: {
		alignItems: "center",
		flex: 1,
	},
	statValue: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
		marginTop: 8,
	},
	statLabel: {
		color: "rgba(255,255,255,0.6)",
		fontSize: 12,
		marginTop: 4,
	},
	infoContainer: {
		alignItems: "center",
	},
	infoText: {
		fontSize: 14,
		color: "rgba(255,255,255,0.6)",
		textAlign: "center",
	},
	timeFrameText: {
		fontSize: 12,
		color: "rgba(255,255,255,0.45)",
		marginTop: 4,
	},
});
