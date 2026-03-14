import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

const supabase = createClient(
	Constants.expoConfig?.extra?.supabaseUrl ?? "",
	Constants.expoConfig?.extra?.supabaseAnonKey ?? "",
);

type FormData = {
	name: string;
	email: string;
	password: string;
};

export default function RegisterForm() {
	const {
		control,
		handleSubmit,
		formState: { errors, isSubmitting },
		reset,
	} = useForm<FormData>();
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	const onSubmit = async (data: FormData) => {
		try {
			setError(null);
			const { error: signUpError } = await supabase.auth.signUp({
				email: data.email,
				password: data.password,
				options: {
					data: {
						name: data.name,
					},
				},
			});

			if (signUpError) throw signUpError;

			setSuccess(true);
			reset();
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred during registration");
		}
	};

	return (
		<SafeAreaView className="w-full px-4 py-6">
			<View className="space-y-4">
				<ThemedText type="title" className="text-center mb-6">
					Create Account
				</ThemedText>

				<Controller
					control={control}
					name="name"
					rules={{ required: "Name is required" }}
					render={({ field: { onChange, value } }) => (
						<View>
							<TextInput
								className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
								placeholder="Your Name"
								placeholderTextColor="#9CA3AF"
								onChangeText={onChange}
								value={value}
							/>
							{errors.name && (
								<ThemedText className="text-red-500 text-sm mt-1">{errors.name.message}</ThemedText>
							)}
						</View>
					)}
				/>

				<Controller
					control={control}
					name="email"
					rules={{
						required: "Email is required",
						pattern: {
							value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
							message: "Invalid email address",
						},
					}}
					render={({ field: { onChange, value } }) => (
						<View>
							<TextInput
								className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
								placeholder="Email"
								placeholderTextColor="#9CA3AF"
								keyboardType="email-address"
								autoCapitalize="none"
								onChangeText={onChange}
								value={value}
							/>
							{errors.email && (
								<ThemedText className="text-red-500 text-sm mt-1">
									{errors.email.message}
								</ThemedText>
							)}
						</View>
					)}
				/>

				<Controller
					control={control}
					name="password"
					rules={{
						required: "Password is required",
						minLength: {
							value: 6,
							message: "Password must be at least 6 characters",
						},
					}}
					render={({ field: { onChange, value } }) => (
						<View>
							<TextInput
								className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
								placeholder="Password"
								placeholderTextColor="#9CA3AF"
								secureTextEntry
								onChangeText={onChange}
								value={value}
							/>
							{errors.password && (
								<ThemedText className="text-red-500 text-sm mt-1">
									{errors.password.message}
								</ThemedText>
							)}
						</View>
					)}
				/>

				{error && <ThemedText className="text-red-500 text-sm text-center">{error}</ThemedText>}
				{success && (
					<ThemedText className="text-green-500 text-sm text-center">
						Registration successful! Please check your email to verify your account.
					</ThemedText>
				)}

				<TouchableOpacity
					className="bg-blue-500 rounded-lg py-3 px-4 mt-4"
					onPress={handleSubmit(onSubmit)}
					disabled={isSubmitting}
				>
					{isSubmitting ? (
						<ActivityIndicator color="white" />
					) : (
						<ThemedText className="text-white text-center font-semibold">Register</ThemedText>
					)}
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
}
