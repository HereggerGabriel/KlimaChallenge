import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Text,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Palette } from "@/constants/Colors";

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
    setError(null);
    const { error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { name: data.name } },
    });
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    setSuccess(true);
    reset();
  };

  if (success) {
    return (
      <View style={styles.container}>
        <Text style={styles.successText}>
          Account created! Check your email to confirm your account, then log in.
        </Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={() => router.replace("/login")}>
            <Text style={styles.buttonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Name */}
      <Controller
        control={control}
        name="name"
        rules={{ required: "Name is required" }}
        render={({ field: { onChange, value } }) => (
          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>Name</Text>
            <View style={[styles.inputBox, errors.name && styles.inputBoxError]}>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor="rgba(255,255,255,0.35)"
                autoCapitalize="words"
                onChangeText={onChange}
                value={value}
              />
            </View>
            {errors.name && <Text style={styles.fieldError}>{errors.name.message}</Text>}
          </View>
        )}
      />

      {/* Email */}
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
              />
            </View>
            {errors.email && <Text style={styles.fieldError}>{errors.email.message}</Text>}
          </View>
        )}
      />

      {/* Password */}
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
              />
            </View>
            {errors.password && <Text style={styles.fieldError}>{errors.password.message}</Text>}
          </View>
        )}
      />

      {error && <Text style={styles.globalError}>{error}</Text>}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          activeOpacity={0.82}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.loginLinkRow} onPress={() => router.replace("/login")}>
        <Text style={styles.loginLink}>Already have an account? Log in</Text>
      </TouchableOpacity>
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
  globalError: {
    color: Palette.red.light,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 4,
  },
  successText: {
    color: Palette.green.light,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonRow: {
    alignItems: "center",
    marginTop: 20,
  },
  button: {
    backgroundColor: Palette.green.mid,
    paddingVertical: 14,
    paddingHorizontal: 52,
    borderRadius: 30,
    minWidth: 180,
    alignItems: "center",
    shadowColor: Palette.green.mid,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  loginLinkRow: {
    alignItems: "center",
    marginTop: 20,
  },
  loginLink: {
    color: Palette.blue.light,
    fontSize: 13,
  },
});
