import React, { useState, useEffect } from "react";
import {
	View,
	ScrollView,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { Palette } from "@/constants/Colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

// TODO: Add more KlimaTicket presets (e.g. Steiermark, Wien, Salzburg, Tirol, etc.)
const TICKET_PRESETS = [
	{ label: "KlimaTicket Ö", cost: 1400 },
	{ label: "Kärnten Ticket", cost: 430 },
] as const;

const CUSTOM_LABEL = "Custom";

export default function ProfileScreen() {
	const [name, setName] = useState("");
	const [selectedTicket, setSelectedTicket] = useState<string>("KlimaTicket Ö");
	const [customTicketName, setCustomTicketName] = useState("");
	const [customTicketCost, setCustomTicketCost] = useState("");
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const [saved, setSaved] = useState(false);

	useEffect(() => {
		const load = async () => {
			const [storedName, storedType, storedCost] = await Promise.all([
				AsyncStorage.getItem("userName"),
				AsyncStorage.getItem("klimaTicketType"),
				AsyncStorage.getItem("klimaTicketCost"),
			]);
			if (storedName) setName(storedName);
			if (storedType) {
				const preset = TICKET_PRESETS.find((p) => p.label === storedType);
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
		return TICKET_PRESETS.find((p) => p.label === selectedTicket)?.cost ?? 1400;
	};

	const getEffectiveLabel = (): string => {
		if (isCustom) return customTicketName.trim() || CUSTOM_LABEL;
		return selectedTicket;
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

				{/* Achievements shortcut */}
				<TouchableOpacity
					style={styles.achievementsButton}
					onPress={() => router.push({ pathname: '/quests', params: { tab: 'achievements' } })}
					activeOpacity={0.8}
				>
					<MaterialIcons name="emoji-events" size={20} color={Palette.green.mid} />
					<ThemedText style={styles.achievementsButtonText}>View Achievements</ThemedText>
					<MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.4)" />
				</TouchableOpacity>

				{/* Name */}
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
								: `€${getEffectiveCost()} / year`}
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
						{TICKET_PRESETS.map((preset) => {
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
									<View>
										<ThemedText
											style={[styles.dropdownItemLabel, active && styles.dropdownItemLabelActive]}
										>
											{preset.label}
										</ThemedText>
										<ThemedText style={styles.dropdownItemCost}>€{preset.cost} / year</ThemedText>
									</View>
									{active && <MaterialIcons name="check" size={18} color={Palette.green.mid} />}
								</TouchableOpacity>
							);
						})}

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
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

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
	customBlock: {
		marginTop: 16,
	},
	achievementsButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		backgroundColor: 'rgba(255,255,255,0.07)',
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.12)',
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 14,
		marginBottom: 28,
	},
	achievementsButtonText: {
		flex: 1,
		color: '#fff',
		fontSize: 15,
		fontWeight: '600',
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
});
