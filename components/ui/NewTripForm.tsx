import React, { useState } from "react";
import { StyleSheet, View, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { router } from "expo-router";

type TripFormData = {
	destination: string;
	startDate: string;
	endDate: string;
	duration: string;
	cost: string;
	description: string;
};

export function NewTripForm() {
	const [formData, setFormData] = useState<TripFormData>({
		destination: "",
		startDate: "",
		endDate: "",
		duration: "",
		cost: "",
		description: "",
	});

	const handleSubmit = () => {
		// TODO: Add validation and data persistence
		console.log("New trip data:", formData);
		router.back();
	};

	return (
		<ScrollView style={styles.container}>
			<ThemedView style={styles.form}>
				<ThemedText type="subtitle" style={styles.title}>
					New Trip
				</ThemedText>

				<View style={styles.inputGroup}>
					<ThemedText style={styles.label}>Destination</ThemedText>
					<TextInput
						style={styles.input}
						value={formData.destination}
						onChangeText={(text) => setFormData({ ...formData, destination: text })}
						placeholder="Enter destination"
						placeholderTextColor="#000"
					/>
				</View>

				<View style={styles.dateGroup}>
					<View style={styles.dateInput}>
						<ThemedText style={styles.label}>Start Date</ThemedText>
						<TextInput
							style={styles.input}
							value={formData.startDate}
							onChangeText={(text) => setFormData({ ...formData, startDate: text })}
							placeholder="MM/DD/YYYY"
							placeholderTextColor="#000"
						/>
					</View>
					<View style={styles.dateInput}>
						<ThemedText style={styles.label}>End Date</ThemedText>
						<TextInput
							style={styles.input}
							value={formData.endDate}
							onChangeText={(text) => setFormData({ ...formData, endDate: text })}
							placeholder="MM/DD/YYYY"
							placeholderTextColor="#000"
						/>
					</View>
				</View>

				<View style={styles.inputGroup}>
					<ThemedText style={styles.label}>Duration</ThemedText>
					<TextInput
						style={styles.input}
						value={formData.duration}
						onChangeText={(text) => setFormData({ ...formData, duration: text })}
						placeholder="e.g., 7 days"
						placeholderTextColor="#000"
					/>
				</View>

				<View style={styles.inputGroup}>
					<ThemedText style={styles.label}>Cost</ThemedText>
					<TextInput
						style={styles.input}
						value={formData.cost}
						onChangeText={(text) => setFormData({ ...formData, cost: text })}
						placeholder="Enter total cost"
						keyboardType="numeric"
						placeholderTextColor="#000"
					/>
				</View>

				<View style={styles.inputGroup}>
					<ThemedText style={styles.label}>Description</ThemedText>
					<TextInput
						style={[styles.input, styles.textArea]}
						value={formData.description}
						onChangeText={(text) => setFormData({ ...formData, description: text })}
						placeholder="Describe your trip"
						multiline
						numberOfLines={4}
						placeholderTextColor="#000"
					/>
				</View>

				<TouchableOpacity style={styles.button} onPress={handleSubmit}>
					<ThemedText style={styles.buttonText}>Save Trip</ThemedText>
				</TouchableOpacity>
			</ThemedView>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	form: {
		padding: 20,
	},
	title: {
		fontSize: 24,
		marginBottom: 24,
	},
	inputGroup: {
		marginBottom: 20,
	},
	dateGroup: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 20,
	},
	dateInput: {
		flex: 1,
		marginHorizontal: 5,
	},
	label: {
		fontSize: 16,
		marginBottom: 8,
	},
	input: {
		backgroundColor: "#fff",
		borderRadius: 8,
		padding: 12,
		fontSize: 16,
		borderWidth: 1,
		borderColor: "#ddd",
	},
	textArea: {
		height: 100,
		textAlignVertical: "top",
		color: "#000",
	},
	button: {
		backgroundColor: "#007AFF",
		borderRadius: 8,
		padding: 16,
		alignItems: "center",
		marginTop: 20,
	},
	buttonText: {
		color: "#000",
		fontSize: 16,
		fontWeight: "600",
	},
});
