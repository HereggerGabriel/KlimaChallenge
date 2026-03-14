import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Palette } from "@/constants/Colors";

type FormData = {
  email: string;
  password: string;
};

const DUMMY_USERS = [
  { email: "test@example.com", password: "password123", name: "Test User", id: "1" },
];

const MAX_ATTEMPTS = 3;

export default function LoginForm() {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: { email: "test@example.com", password: "password123" },
  });
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  const onSubmit = async (data: FormData) => {
    setError(null);
    if (attempts >= MAX_ATTEMPTS) {
      setError("Too many failed attempts. Please try again later.");
      return;
    }
    await new Promise((r) => setTimeout(r, 900));
    const user = DUMMY_USERS.find(
      (u) => u.email === data.email && u.password === data.password
    );
    if (user) {
      setAttempts(0);
      await AsyncStorage.setItem("isAuthenticated", "true");
      await AsyncStorage.setItem("userData", JSON.stringify({ id: user.id, name: user.name, email: user.email }));
      router.replace("/(tabs)/user");
    } else {
      setAttempts((p) => p + 1);
      setError(`Invalid credentials. ${MAX_ATTEMPTS - attempts - 1} attempts remaining.`);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert("Reset Password", "A reset link will be sent to your email.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Send Link",
        onPress: () => Alert.alert("Sent", "Password reset link sent!"),
      },
    ]);
  };

  const locked = attempts >= MAX_ATTEMPTS;

  return (
    <View style={styles.container}>
      {/* Email input */}
      <Controller
        control={control}
        name="email"
        rules={{
          required: "Email is required",
          pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: "Invalid email" },
        }}
        render={({ field: { onChange, value } }) => (
          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>Email</Text>
            <View style={[styles.inputBox, errors.email && styles.inputBoxError]}>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="rgba(255,255,255,0.35)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={onChange}
                value={value}
                editable={!locked}
              />
            </View>
            {errors.email && <Text style={styles.fieldError}>{errors.email.message}</Text>}
          </View>
        )}
      />

      {/* Password input */}
      <Controller
        control={control}
        name="password"
        rules={{
          required: "Password is required",
          minLength: { value: 6, message: "Min 6 characters" },
        }}
        render={({ field: { onChange, value } }) => (
          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={[styles.inputBox, errors.password && styles.inputBoxError]}>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="rgba(255,255,255,0.35)"
                secureTextEntry
                onChangeText={onChange}
                value={value}
                editable={!locked}
              />
            </View>
            {errors.password && <Text style={styles.fieldError}>{errors.password.message}</Text>}
          </View>
        )}
      />

      {/* Forgot / Sign up links */}
      <View style={styles.linksRow}>
        <TouchableOpacity onPress={handleForgotPassword} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
          <Text style={styles.linkText}>Forgot password?</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/register")} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
          <Text style={styles.linkText}>Sign up</Text>
        </TouchableOpacity>
      </View>

      {/* Global error */}
      {error && <Text style={styles.globalError}>{error}</Text>}

      {/* Login button — small, centered */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.loginButton, (isSubmitting || locked) && styles.loginButtonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting || locked}
          activeOpacity={0.82}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.loginButtonText}>Log In</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  inputBlock: {
    marginBottom: 12,
  },
  inputLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 7,
    marginLeft: 2,
  },
  inputBox: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  inputBoxError: {
    borderColor: Palette.red.light,
  },
  input: {
    color: "#ffffff",
    fontSize: 16,
    padding: 0,
  },
  fieldError: {
    color: Palette.red.light,
    fontSize: 12,
    marginTop: 5,
    marginLeft: 2,
  },
  linksRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  linkText: {
    color: Palette.blue.light,
    fontSize: 13,
  },
  globalError: {
    color: Palette.red.light,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 4,
  },
  buttonRow: {
    alignItems: "center",
    marginTop: 20,
  },
  loginButton: {
    backgroundColor: Palette.green.mid,
    paddingVertical: 14,
    paddingHorizontal: 52,
    borderRadius: 30,
    minWidth: 160,
    alignItems: "center",
    shadowColor: Palette.green.mid,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  loginButtonDisabled: {
    opacity: 0.5,
  },
  loginButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
});
