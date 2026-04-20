import React, { useState, useEffect, useRef } from "react";
import {
	View,
	ScrollView,
	TextInput,
	TouchableOpacity,
	TouchableWithoutFeedback,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
} from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withSpring,
} from "react-native-reanimated";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadTrips, saveTrips } from "@/services/tripStorage";
import { exportTrips, importTrips, ImportResult } from "@/services/tripExport";
import { ThemedText } from "@/components/ThemedText";
import { Palette } from "@/constants/Colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

type TicketPreset = {
	label: string;
	cost: number;
	description: string;
	period?: "month";
};

const TICKET_GROUPS: { group: string; presets: TicketPreset[] }[] = [
	{
		group: "Nationwide",
		presets: [
			{ label: "KlimaTicket Ö Classic", cost: 1400, description: "Standard adult" },
			{ label: "KlimaTicket Ö Youth", cost: 1050, description: "Under 26" },
			{ label: "KlimaTicket Ö Senior", cost: 1050, description: "65 and older" },
			{ label: "KlimaTicket Ö Classic (Reduced)", cost: 1050, description: "Disabilities / civil service" },
			{ label: "KlimaTicket Ö Family", cost: 1540, description: "Adults + children travel free" },
			{ label: "KlimaTicket Ö (1-month)", cost: 120, description: "Short-term / tourists", period: "month" },
		],
	},
	{
		group: "Regional",
		presets: [
			{ label: "KlimaTicket Wien", cost: 467, description: "Vienna" },
			{ label: "KlimaTicket Wien (Reduced)", cost: 300, description: "Vienna" },
			{ label: "KlimaTicket Ost", cost: 1000, description: "Vienna, Lower Austria, Burgenland" },
			{ label: "KlimaTicket Ost (Reduced)", cost: 700, description: "Vienna, Lower Austria, Burgenland" },
			{ label: "KlimaTicket Steiermark", cost: 514, description: "Styria" },
			{ label: "KlimaTicket Steiermark (Reduced)", cost: 386, description: "Styria" },
			{ label: "KlimaTicket Steiermark Shared", cost: 624, description: "Styria" },
			{ label: "KlimaTicket OÖ", cost: 467, description: "Upper Austria" },
			{ label: "KlimaTicket OÖ (Reduced)", cost: 350, description: "Upper Austria" },
			{ label: "KlimaTicket Salzburg Classic", cost: 399, description: "Salzburg" },
			{ label: "KlimaTicket Salzburg Classic Plus", cost: 499, description: "Salzburg" },
			{ label: "KlimaTicket Salzburg Special", cost: 299, description: "Salzburg" },
			{ label: "KlimaTicket Tirol", cost: 590, description: "Tyrol" },
			{ label: "KlimaTicket Tirol (Reduced)", cost: 301, description: "Tyrol" },
			{ label: "KlimaTicket Vorarlberg", cost: 495, description: "Vorarlberg" },
			{ label: "KlimaTicket Vorarlberg (Reduced)", cost: 295, description: "Vorarlberg" },
			{ label: "KlimaTicket Kärnten", cost: 430, description: "Carinthia" },
			{ label: "KlimaTicket Kärnten (Reduced)", cost: 320, description: "Carinthia" },
			{ label: "KlimaTicket Kärnten Special", cost: 210, description: "Carinthia" },
			{ label: "KlimaTicket Kärnten Family", cost: 545, description: "Carinthia" },
		],
	},
];

const ALL_PRESETS = TICKET_GROUPS.flatMap((g) => g.presets);
const CUSTOM_LABEL = "Custom";

function formatCost(preset: TicketPreset): string {
	return `€${preset.cost} / ${preset.period ?? "year"}`;
}

const THUMB_SIZE = 48;

function SlideToDelete({ onConfirmed }: { onConfirmed: () => void }) {
	const trackWidthRef = useRef(0);
	const translateX = useSharedValue(0);

	const gesture = Gesture.Pan()
		.runOnJS(true)
		.onUpdate((e) => {
			const maxX = trackWidthRef.current - THUMB_SIZE - 8;
			translateX.value = Math.max(0, Math.min(e.translationX, maxX));
		})
		.onEnd((e) => {
			const maxX = trackWidthRef.current - THUMB_SIZE - 8;
			if (maxX > 0 && e.translationX >= maxX * 0.85) {
				translateX.value = withSpring(maxX);
				setTimeout(() => {
					translateX.value = withSpring(0);
					onConfirmed();
				}, 350);
			} else {
				translateX.value = withSpring(0);
			}
		});

	const thumbStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: translateX.value }],
	}));

	return (
		<GestureDetector gesture={gesture}>
			<View
				style={sliderStyles.track}
				onLayout={(e) => { trackWidthRef.current = e.nativeEvent.layout.width; }}
			>
				<ThemedText style={sliderStyles.trackText}>Slide to delete all trips</ThemedText>
				<Animated.View style={[sliderStyles.thumb, thumbStyle]}>
					<MaterialIcons name="chevron-right" size={24} color="#fff" />
				</Animated.View>
			</View>
		</GestureDetector>
	);
}

export default function ProfileScreen() {
	const [name, setName] = useState("");
	const [selectedTicket, setSelectedTicket] = useState<string>("KlimaTicket Ö Classic");
	const [customTicketName, setCustomTicketName] = useState("");
	const [customTicketCost, setCustomTicketCost] = useState("");
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const [saved, setSaved] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [importResult, setImportResult] = useState<ImportResult | null>(null);

	useEffect(() => {
		const load = async () => {
			const [storedName, storedType, storedCost] = await Promise.all([
				AsyncStorage.getItem("userName"),
				AsyncStorage.getItem("klimaTicketType"),
				AsyncStorage.getItem("klimaTicketCost"),
			]);
			if (storedName) setName(storedName);
			if (storedType) {
				const preset = ALL_PRESETS.find((p) => p.label === storedType);
				if (preset) {
					setSelectedTicket(preset.label);
				} else {
					setSelectedTicket(CUSTOM_LABEL);
					setCustomTicketName(storedType);
					if (storedCost) setCustomTicketCost(storedCost);
				}
			}
		};
		load();
	}, []);

	const isCustom = selectedTicket === CUSTOM_LABEL;

	const getEffectiveCost = (): number => {
		if (isCustom) return parseFloat(customTicketCost) || 0;
		return ALL_PRESETS.find((p) => p.label === selectedTicket)?.cost ?? 1400;
	};

	const getEffectiveLabel = (): string => {
		if (isCustom) return customTicketName.trim() || CUSTOM_LABEL;
		return selectedTicket;
	};

	const getEffectivePeriod = (): string => {
		if (isCustom) return "year";
		return ALL_PRESETS.find((p) => p.label === selectedTicket)?.period ?? "year";
	};

	const handleSave = async () => {
		const cost = getEffectiveCost();
		const label = getEffectiveLabel();
		await Promise.all([
			AsyncStorage.setItem("userName", name.trim()),
			AsyncStorage.setItem("klimaTicketType", label),
			AsyncStorage.setItem("klimaTicketCost", cost.toString()),
		]);
		setSaved(true);
		setTimeout(() => setSaved(false), 2000);
	};

	const handleDeleteAllTrips = async () => {
		await Promise.all([
			saveTrips([]),
			AsyncStorage.removeItem("userXP"),
			AsyncStorage.removeItem("@mainQuestCelebrated"),
			AsyncStorage.multiRemove([
				"@claimedQuests",
				"@claimedAchievements",
				"@dailyQuestSelection",
				"@weeklyQuestSelection",
			]),
		]);
		setShowDeleteModal(false);
	};

	const handleExport = async () => {
		const trips = await loadTrips();
		await exportTrips(trips);
	};

	const handleImport = async () => {
		try {
			const result = await importTrips();
			if (result.total > 0) {
				setImportResult(result);
				setTimeout(() => setImportResult(null), 4000);
			}
		} catch (e) {
			setImportResult({ added: 0, skipped: 0, total: -1 });
			setTimeout(() => setImportResult(null), 4000);
		}
	};

	const initials = name.trim() ? name.trim()[0].toUpperCase() : "?";

	return (
		<KeyboardAvoidingView
			style={styles.root}
			behavior={Platform.OS === "ios" ? "padding" : undefined}
		>
			<ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
				{/* Header */}
				<View style={styles.header}>
					<TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
						<MaterialIcons name="chevron-left" size={30} color="#fff" />
					</TouchableOpacity>
					<ThemedText style={styles.headerTitle}>Profile</ThemedText>
					<View style={{ width: 40 }} />
				</View>

				{/* Avatar */}
				<View style={styles.avatarSection}>
					<View style={styles.avatar}>
						<ThemedText style={styles.avatarText}>{initials}</ThemedText>
					</View>
				</View>

				{/* Display Name */}
				<ThemedText style={styles.label}>Display Name</ThemedText>
				<TextInput
					style={styles.input}
					value={name}
					onChangeText={setName}
					placeholder="Your name"
					placeholderTextColor="rgba(255,255,255,0.3)"
					autoCapitalize="words"
				/>

				{/* KlimaTicket Selector */}
				<ThemedText style={[styles.label, { marginTop: 24 }]}>KlimaTicket Type</ThemedText>
				<TouchableOpacity
					style={styles.dropdownTrigger}
					onPress={() => setDropdownOpen((v) => !v)}
					activeOpacity={0.8}
				>
					<View style={{ flex: 1 }}>
						<ThemedText style={styles.dropdownTriggerText}>
							{isCustom ? customTicketName || "Custom" : selectedTicket}
						</ThemedText>
						<ThemedText style={styles.dropdownTriggerCost}>
							{isCustom
								? customTicketCost ? `€${customTicketCost} / year` : "Enter cost below"
								: `€${getEffectiveCost()} / ${getEffectivePeriod()}`}
						</ThemedText>
					</View>
					<MaterialIcons
						name={dropdownOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"}
						size={22}
						color="rgba(255,255,255,0.5)"
					/>
				</TouchableOpacity>

				{dropdownOpen && (
					<View style={styles.dropdown}>
						{TICKET_GROUPS.map((group) => (
							<React.Fragment key={group.group}>
								<View style={styles.dropdownGroupHeader}>
									<ThemedText style={styles.dropdownGroupHeaderText}>{group.group}</ThemedText>
								</View>
								{group.presets.map((preset) => {
									const active = selectedTicket === preset.label;
									return (
										<TouchableOpacity
											key={preset.label}
											style={[styles.dropdownItem, active && styles.dropdownItemActive]}
											onPress={() => {
												setSelectedTicket(preset.label);
												setDropdownOpen(false);
											}}
											activeOpacity={0.75}
										>
											<View style={{ flex: 1 }}>
												<ThemedText
													style={[styles.dropdownItemLabel, active && styles.dropdownItemLabelActive]}
												>
													{preset.label}
												</ThemedText>
												<ThemedText style={styles.dropdownItemCost}>{formatCost(preset)}</ThemedText>
												<ThemedText style={styles.dropdownItemDesc}>{preset.description}</ThemedText>
											</View>
											{active && <MaterialIcons name="check" size={18} color={Palette.green.mid} />}
										</TouchableOpacity>
									);
								})}
							</React.Fragment>
						))}

						{/* Custom option */}
						<TouchableOpacity
							style={[styles.dropdownItem, isCustom && styles.dropdownItemActive, styles.dropdownItemLast]}
							onPress={() => {
								setSelectedTicket(CUSTOM_LABEL);
								setDropdownOpen(false);
							}}
							activeOpacity={0.75}
						>
							<ThemedText
								style={[styles.dropdownItemLabel, isCustom && styles.dropdownItemLabelActive]}
							>
								Custom
							</ThemedText>
							{isCustom && <MaterialIcons name="check" size={18} color={Palette.green.mid} />}
						</TouchableOpacity>
					</View>
				)}

				{/* Custom ticket inputs */}
				{isCustom && (
					<View style={styles.customBlock}>
						<ThemedText style={styles.label}>Ticket Name</ThemedText>
						<TextInput
							style={styles.input}
							value={customTicketName}
							onChangeText={setCustomTicketName}
							placeholder="e.g. Steiermark Ticket"
							placeholderTextColor="rgba(255,255,255,0.3)"
						/>
						<ThemedText style={[styles.label, { marginTop: 14 }]}>Annual Cost (€)</ThemedText>
						<TextInput
							style={styles.input}
							value={customTicketCost}
							onChangeText={setCustomTicketCost}
							placeholder="e.g. 750"
							placeholderTextColor="rgba(255,255,255,0.3)"
							keyboardType="decimal-pad"
						/>
					</View>
				)}

				{/* Save */}
				<TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
					<MaterialIcons name={saved ? "check" : "save"} size={18} color="#fff" />
					<ThemedText style={styles.saveButtonText}>{saved ? "Saved!" : "Save Changes"}</ThemedText>
				</TouchableOpacity>

				{/* Navigation shortcuts */}
				<View style={styles.navSection}>
					<TouchableOpacity
						style={styles.navButton}
						onPress={() => router.push('/stats')}
						activeOpacity={0.8}
					>
						<MaterialIcons name="insights" size={20} color={Palette.blue.light} />
						<ThemedText style={styles.navButtonText}>Stats & Insights</ThemedText>
						<MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.4)" />
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.navButton}
						onPress={() => router.push({ pathname: '/quests', params: { tab: 'achievements' } })}
						activeOpacity={0.8}
					>
						<MaterialIcons name="emoji-events" size={20} color={Palette.green.mid} />
						<ThemedText style={styles.navButtonText}>View Achievements</ThemedText>
						<MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.4)" />
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.navButton}
						onPress={() => router.push('/trips')}
						activeOpacity={0.8}
					>
						<MaterialIcons name="format-list-bulleted" size={20} color={Palette.blue.light} />
						<ThemedText style={styles.navButtonText}>My Trips</ThemedText>
						<MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.4)" />
					</TouchableOpacity>
				</View>

				{/* Data Management */}
				<View style={styles.navSection}>
					<ThemedText style={styles.dataLabel}>Data</ThemedText>
					<TouchableOpacity
						style={styles.navButton}
						onPress={handleExport}
						activeOpacity={0.8}
					>
						<MaterialIcons name="file-upload" size={20} color={Palette.blue.light} />
						<ThemedText style={styles.navButtonText}>Export Trips</ThemedText>
						<MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.4)" />
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.navButton}
						onPress={handleImport}
						activeOpacity={0.8}
					>
						<MaterialIcons name="file-download" size={20} color={Palette.green.mid} />
						<ThemedText style={styles.navButtonText}>Import Trips</ThemedText>
						<MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.4)" />
					</TouchableOpacity>

					{importResult && (
						<View style={styles.importFeedback}>
							<MaterialIcons
								name={importResult.total === -1 ? "error-outline" : "check-circle"}
								size={16}
								color={importResult.total === -1 ? Palette.red.light : Palette.green.mid}
							/>
							<ThemedText style={styles.importFeedbackText}>
								{importResult.total === -1
									? "Invalid file format"
									: `${importResult.added} added, ${importResult.skipped} skipped`}
							</ThemedText>
						</View>
					)}
				</View>

				{/* Danger Zone */}
				<View style={styles.dangerZone}>
					<ThemedText style={styles.dangerZoneLabel}>Danger Zone</ThemedText>
					<TouchableOpacity
						style={styles.deleteButton}
						onPress={() => setShowDeleteModal(true)}
						activeOpacity={0.8}
					>
						<MaterialIcons name="delete-forever" size={18} color={Palette.red.light} />
						<ThemedText style={styles.deleteButtonText}>Delete All Trips</ThemedText>
					</TouchableOpacity>
				</View>
			</ScrollView>

			{/* Dropdown dismiss overlay */}
			{dropdownOpen && (
				<TouchableWithoutFeedback onPress={() => setDropdownOpen(false)}>
					<View style={styles.dropdownDismissOverlay} />
				</TouchableWithoutFeedback>
			)}

			{/* Delete confirmation overlay */}
			{showDeleteModal && (
				<View style={styles.modalOverlay}>
					<View style={styles.modalCard}>
						<View style={styles.modalIconRow}>
							<MaterialIcons name="warning" size={32} color={Palette.red.light} />
						</View>
						<ThemedText style={styles.modalTitle}>Delete All Trips?</ThemedText>
						<ThemedText style={styles.modalBody}>
							This will permanently delete all your trips and reset your XP. This cannot be undone.
						</ThemedText>

						<SlideToDelete onConfirmed={handleDeleteAllTrips} />

						<TouchableOpacity
							style={styles.modalCancelButton}
							onPress={() => setShowDeleteModal(false)}
							activeOpacity={0.8}
						>
							<ThemedText style={styles.modalCancelText}>Cancel</ThemedText>
						</TouchableOpacity>
					</View>
				</View>
			)}
		</KeyboardAvoidingView>
	);
}

const sliderStyles = StyleSheet.create({
	track: {
		height: THUMB_SIZE + 8,
		backgroundColor: "rgba(220,50,50,0.15)",
		borderRadius: (THUMB_SIZE + 8) / 2,
		borderWidth: 1,
		borderColor: "rgba(220,50,50,0.35)",
		justifyContent: "center",
		paddingHorizontal: 4,
		overflow: "hidden",
	},
	trackText: {
		textAlign: "center",
		color: "rgba(255,255,255,0.35)",
		fontSize: 13,
		fontWeight: "600",
	},
	thumb: {
		position: "absolute",
		left: 4,
		width: THUMB_SIZE,
		height: THUMB_SIZE,
		borderRadius: THUMB_SIZE / 2,
		backgroundColor: Palette.red.light,
		alignItems: "center",
		justifyContent: "center",
	},
	dataLabel: {
		fontSize: 12,
		color: "rgba(255,255,255,0.55)",
		fontWeight: "600",
		marginBottom: 8,
		letterSpacing: 0.8,
		textTransform: "uppercase" as const,
	},
	importFeedback: {
		flexDirection: "row" as const,
		alignItems: "center" as const,
		gap: 6,
		paddingHorizontal: 16,
		paddingVertical: 10,
		backgroundColor: "rgba(255,255,255,0.04)",
		borderRadius: 10,
	},
	importFeedbackText: {
		color: "rgba(255,255,255,0.6)",
		fontSize: 13,
	},
});

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: Palette.blue.dark,
	},
	scroll: {
		flex: 1,
	},
	content: {
		padding: 20,
		paddingTop: 52,
		paddingBottom: 48,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 32,
	},
	backButton: {
		width: 40,
		height: 40,
		alignItems: "center",
		justifyContent: "center",
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: "700",
		color: "#fff",
	},
	avatarSection: {
		alignItems: "center",
		marginBottom: 32,
	},
	avatar: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: Palette.green.mid,
		alignItems: "center",
		justifyContent: "center",
	},
	avatarText: {
		fontSize: 34,
		fontWeight: "700",
		color: "#fff",
	},
	label: {
		fontSize: 12,
		color: "rgba(255,255,255,0.55)",
		fontWeight: "600",
		marginBottom: 8,
		letterSpacing: 0.8,
		textTransform: "uppercase",
	},
	input: {
		backgroundColor: "rgba(255,255,255,0.08)",
		borderRadius: 10,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.12)",
		paddingHorizontal: 14,
		paddingVertical: 12,
		color: "#fff",
		fontSize: 15,
	},
	dropdownTrigger: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "rgba(255,255,255,0.08)",
		borderRadius: 10,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.12)",
		paddingHorizontal: 14,
		paddingVertical: 12,
	},
	dropdownTriggerText: {
		color: "#fff",
		fontSize: 15,
		fontWeight: "500",
	},
	dropdownTriggerCost: {
		color: "rgba(255,255,255,0.4)",
		fontSize: 12,
		marginTop: 2,
	},
	dropdown: {
		marginTop: 4,
		backgroundColor: "rgba(255,255,255,0.06)",
		borderRadius: 10,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.12)",
		overflow: "hidden",
		zIndex: 11,
	},
	dropdownGroupHeader: {
		paddingHorizontal: 14,
		paddingVertical: 8,
		backgroundColor: "rgba(255,255,255,0.04)",
		borderBottomWidth: 1,
		borderBottomColor: "rgba(255,255,255,0.07)",
	},
	dropdownGroupHeaderText: {
		fontSize: 11,
		fontWeight: "700",
		color: "rgba(255,255,255,0.4)",
		textTransform: "uppercase",
		letterSpacing: 0.8,
	},
	dropdownItem: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 14,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: "rgba(255,255,255,0.07)",
	},
	dropdownItemLast: {
		borderBottomWidth: 0,
	},
	dropdownItemActive: {
		backgroundColor: "rgba(63,178,143,0.12)",
	},
	dropdownItemLabel: {
		color: "rgba(255,255,255,0.75)",
		fontSize: 15,
	},
	dropdownItemLabelActive: {
		color: "#fff",
		fontWeight: "600",
	},
	dropdownItemCost: {
		color: "rgba(255,255,255,0.4)",
		fontSize: 12,
		marginTop: 2,
	},
	dropdownItemDesc: {
		color: "rgba(255,255,255,0.3)",
		fontSize: 11,
		marginTop: 1,
	},
	customBlock: {
		marginTop: 16,
	},
	saveButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		marginTop: 36,
		paddingVertical: 14,
		backgroundColor: Palette.green.mid,
		borderRadius: 12,
	},
	saveButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
	navSection: {
		marginTop: 32,
		gap: 10,
	},
	navButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		backgroundColor: "rgba(255,255,255,0.07)",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.12)",
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 14,
	},
	navButtonText: {
		flex: 1,
		color: "#fff",
		fontSize: 15,
		fontWeight: "600",
	},
	dangerZone: {
		marginTop: 40,
		paddingTop: 24,
		borderTopWidth: 1,
		borderTopColor: "rgba(255,255,255,0.08)",
	},
	dangerZoneLabel: {
		fontSize: 12,
		color: "rgba(220,50,50,0.6)",
		fontWeight: "600",
		marginBottom: 12,
		letterSpacing: 0.8,
		textTransform: "uppercase",
	},
	deleteButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingVertical: 13,
		paddingHorizontal: 16,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: "rgba(220,50,50,0.35)",
		backgroundColor: "rgba(220,50,50,0.08)",
	},
	deleteButtonText: {
		color: Palette.red.light,
		fontSize: 15,
		fontWeight: "600",
	},
	dropdownDismissOverlay: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		zIndex: 10,
	},
	modalOverlay: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		zIndex: 99,
		backgroundColor: "rgba(0,0,0,0.7)",
		justifyContent: "center",
		alignItems: "center",
		padding: 24,
	},
	modalCard: {
		width: "100%",
		backgroundColor: "#0a2a3d",
		borderRadius: 16,
		borderWidth: 1,
		borderColor: "rgba(220,50,50,0.3)",
		padding: 24,
		gap: 12,
	},
	modalIconRow: {
		alignItems: "center",
		marginBottom: 4,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: "700",
		color: "#fff",
		textAlign: "center",
	},
	modalBody: {
		fontSize: 14,
		color: "rgba(255,255,255,0.55)",
		textAlign: "center",
		lineHeight: 20,
		marginBottom: 8,
	},
	modalCancelButton: {
		marginTop: 4,
		paddingVertical: 13,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.12)",
		alignItems: "center",
	},
	modalCancelText: {
		color: "rgba(255,255,255,0.6)",
		fontSize: 15,
		fontWeight: "600",
	},
	dataLabel: {
		fontSize: 12,
		color: "rgba(255,255,255,0.55)",
		fontWeight: "600",
		marginBottom: 8,
		letterSpacing: 0.8,
		textTransform: "uppercase" as const,
	},
	importFeedback: {
		flexDirection: "row" as const,
		alignItems: "center" as const,
		gap: 6,
		paddingHorizontal: 16,
		paddingVertical: 10,
		backgroundColor: "rgba(255,255,255,0.04)",
		borderRadius: 10,
	},
	importFeedbackText: {
		color: "rgba(255,255,255,0.6)",
		fontSize: 13,
	},
});
