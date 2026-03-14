import { StyleSheet } from "react-native";
import { Palette } from "@/constants/Colors";

export const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Palette.blue.dark,
		padding: 20,
	},
	header: {
		marginBottom: 24,
		paddingTop: 8,
	},
	headerTitle: {
		color: "#fff",
		marginBottom: 4,
	},
	headerSubRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	subtitle: {
		fontSize: 15,
		color: "rgba(255,255,255,0.55)",
		marginTop: 4,
	},
	section: {
		marginTop: 24,
	},
	sectionHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 16,
	},
	addButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
		paddingVertical: 7,
		paddingHorizontal: 14,
		backgroundColor: Palette.green.mid,
		borderRadius: 20,
	},
	addButtonText: {
		fontSize: 14,
		color: "#fff",
		fontWeight: "600",
	},
	tripCard: {
		padding: 16,
		borderRadius: 14,
		marginBottom: 12,
		backgroundColor: "rgba(255,255,255,0.07)",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.12)",
	},
	tripHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 12,
	},
	tripTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#fff",
		marginBottom: 4,
	},
	tripDate: {
		fontSize: 13,
		color: "rgba(255,255,255,0.5)",
	},
	tripCost: {
		fontSize: 18,
		fontWeight: "700",
		color: Palette.green.mid,
	},
	tripDetails: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 12,
	},
	tripDetail: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	tripDetailText: {
		fontSize: 13,
		color: "rgba(255,255,255,0.55)",
	},
	sectionTitle: {
		marginBottom: 12,
		color: "#fff",
	},
	favoritesGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 10,
	},
	favoriteCard: {
		width: "48%",
		backgroundColor: "rgba(255,255,255,0.07)",
		borderRadius: 12,
		padding: 12,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.12)",
		overflow: "hidden",
	},
	fillOverlay: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: "rgba(63,178,143,0.45)",
	},
	flashOverlay: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: Palette.green.mid,
	},
	favoriteCardTop: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 8,
	},
	favoriteRoute: {
		flex: 1,
		fontSize: 13,
		fontWeight: "600",
		color: "#fff",
		marginRight: 6,
	},
	favoriteBadge: {
		backgroundColor: Palette.green.mid,
		borderRadius: 10,
		paddingHorizontal: 6,
		paddingVertical: 2,
	},
	favoriteBadgeText: {
		color: "#fff",
		fontSize: 11,
		fontWeight: "600",
	},
	favoriteCardBottom: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	favoriteTransport: {
		fontSize: 12,
		color: Palette.blue.light,
		flex: 1,
	},
	favoriteDistance: {
		fontSize: 12,
		color: "rgba(255,255,255,0.5)",
	},
});
