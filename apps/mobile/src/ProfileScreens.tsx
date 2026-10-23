import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { profileClient, ProfileData, NutritionProfile } from "./profileClient";
import { useAuth } from "./AuthContext";

const ACTIVITY_LEVELS = [
  { label: "Sedentary (little/no exercise)", value: "sedentary" },
  { label: "Lightly Active (1-3 days/week)", value: "lightly_active" },
  { label: "Moderately Active (3-5 days/week)", value: "moderately_active" },
  { label: "Very Active (6-7 days/week)", value: "very_active" },
  { label: "Extra Active (physical job)", value: "extra_active" },
];

const GOALS = [
  { label: "Weight Loss", value: "weight_loss" },
  { label: "Maintenance", value: "maintenance" },
  { label: "Muscle Gain", value: "muscle_gain" },
];

const GENDERS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];

interface ProfileFormData {
  age: string;
  gender: "male" | "female" | "other";
  height_cm: string;
  weight_kg: string;
  activity_level: "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "extra_active";
  goal: "weight_loss" | "maintenance" | "muscle_gain";
}

interface DropdownProps<T extends string> {
  label: string;
  value: T;
  options: Array<{ label: string; value: T }>;
  onChange: (value: T) => void;
  disabled?: boolean;
}

const Dropdown = <T extends string>({ label, value, options, onChange, disabled }: DropdownProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label || label;

  return (
    <View>
      <TouchableOpacity
        style={[styles.dropdownButton, disabled && styles.disabled]}
        onPress={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <Text style={styles.dropdownButtonText}>{selectedLabel}</Text>
        <Text style={styles.dropdownArrow}>{isOpen ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.dropdownMenu}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.dropdownItem,
                value === option.value && styles.dropdownItemSelected,
              ]}
              onPress={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              <Text
                style={[
                  styles.dropdownItemText,
                  value === option.value && styles.dropdownItemTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export const ProfileFormScreen: React.FC<{ onProfileCreated: (profile: ProfileData) => void }> = ({ onProfileCreated }) => {
  const [formData, setFormData] = useState<ProfileFormData>({
    age: "",
    gender: "male",
    height_cm: "",
    weight_kg: "",
    activity_level: "moderately_active",
    goal: "maintenance",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = async () => {
    setErrors([]);

    if (!formData.age || !formData.height_cm || !formData.weight_kg) {
      setErrors(["Please fill in all fields"]);
      return;
    }

    setIsLoading(true);
    try {
      const profile: NutritionProfile = {
        age: parseInt(formData.age, 10),
        gender: formData.gender,
        height_cm: parseFloat(formData.height_cm),
        weight_kg: parseFloat(formData.weight_kg),
        activity_level: formData.activity_level,
        goal: formData.goal,
      };

      const result = await profileClient.createProfile(profile);
      onProfileCreated(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create profile";
      setErrors([message]);
      Alert.alert("Error", message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Create Your Profile</Text>
      <Text style={styles.subtitle}>Enter your health metrics</Text>

      {errors.length > 0 && (
        <View style={styles.errorContainer}>
          {errors.map((error, idx) => (
            <Text key={idx} style={styles.errorText}>
              • {error}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.formGroup}>
        <Text style={styles.label}>Age (years)</Text>
        <TextInput
          style={styles.input}
          placeholder="30"
          keyboardType="numeric"
          value={formData.age}
          onChangeText={(text) => setFormData({ ...formData, age: text })}
          editable={!isLoading}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Gender</Text>
        <Dropdown
          label="Select gender"
          value={formData.gender}
          options={GENDERS}
          onChange={(value: string) => setFormData({ ...formData, gender: value as "male" | "female" | "other" })}
          disabled={isLoading}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Height (cm)</Text>
        <TextInput
          style={styles.input}
          placeholder="180"
          keyboardType="decimal-pad"
          value={formData.height_cm}
          onChangeText={(text) => setFormData({ ...formData, height_cm: text })}
          editable={!isLoading}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Weight (kg)</Text>
        <TextInput
          style={styles.input}
          placeholder="80"
          keyboardType="decimal-pad"
          value={formData.weight_kg}
          onChangeText={(text) => setFormData({ ...formData, weight_kg: text })}
          editable={!isLoading}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Activity Level</Text>
        <Dropdown
          label="Select activity level"
          value={formData.activity_level}
          options={ACTIVITY_LEVELS}
          onChange={(value: string) => setFormData({ ...formData, activity_level: value as "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "extra_active" })}
          disabled={isLoading}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Goal</Text>
        <Dropdown
          label="Select goal"
          value={formData.goal}
          options={GOALS}
          onChange={(value: string) => setFormData({ ...formData, goal: value as "weight_loss" | "maintenance" | "muscle_gain" })}
          disabled={isLoading}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Create Profile</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

export const ProfileDisplayScreen: React.FC<{ 
  profile: ProfileData
  onEdit: () => void
  onLogout: () => void
  onOpenFoodSearch: () => void
  onOpenMealTracking: () => void
  onOpenInventory: () => void
  onOpenShoppingList: () => void
}> = ({
  profile,
  onEdit,
  onLogout,
  onOpenFoodSearch,
  onOpenMealTracking,
  onOpenInventory,
  onOpenShoppingList,
}) => {
  const formatNumber = (num: number) => Math.round(num);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Your Nutrition Profile</Text>

      <View style={styles.profileCard}>
        <Text style={styles.cardTitle}>Personal Info</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Age:</Text>
          <Text style={styles.infoValue}>{profile.age} years</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Gender:</Text>
          <Text style={styles.infoValue}>{profile.gender}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Height:</Text>
          <Text style={styles.infoValue}>{profile.height_cm} cm</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Weight:</Text>
          <Text style={styles.infoValue}>{profile.weight_kg} kg</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Activity:</Text>
          <Text style={styles.infoValue}>{profile.activity_level.replace(/_/g, " ")}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Goal:</Text>
          <Text style={styles.infoValue}>{profile.goal.replace(/_/g, " ")}</Text>
        </View>
      </View>

      <View style={styles.profileCard}>
        <Text style={styles.cardTitle}>Calculated Nutrition Targets</Text>
        <View style={styles.targetRow}>
          <Text style={styles.targetLabel}>Basal Metabolic Rate (BMR)</Text>
          <Text style={styles.targetValue}>{formatNumber(profile.bmr)} kcal/day</Text>
        </View>
        <View style={styles.targetRow}>
          <Text style={styles.targetLabel}>Maintenance Calories</Text>
          <Text style={styles.targetValue}>{formatNumber(profile.maintenance_calories)} kcal/day</Text>
        </View>
        <View style={styles.targetRow}>
          <Text style={styles.targetLabel}>Target Calories</Text>
          <Text style={styles.targetValueHighlight}>{formatNumber(profile.target_calories)} kcal/day</Text>
        </View>
      </View>

      <View style={styles.profileCard}>
        <Text style={styles.cardTitle}>Daily Macronutrient Targets</Text>
        <View style={styles.macroRow}>
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>{formatNumber(profile.target_protein_g)}g</Text>
            <Text style={styles.macroLabel}>Protein</Text>
            <Text style={styles.macroDetail}>4 kcal/g</Text>
          </View>
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>{formatNumber(profile.target_carbohydrates_g)}g</Text>
            <Text style={styles.macroLabel}>Carbs</Text>
            <Text style={styles.macroDetail}>4 kcal/g</Text>
          </View>
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>{formatNumber(profile.target_fat_g)}g</Text>
            <Text style={styles.macroLabel}>Fat</Text>
            <Text style={styles.macroDetail}>9 kcal/g</Text>
          </View>
        </View>
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity style={styles.mealButton} onPress={onOpenMealTracking}>
          <Text style={styles.buttonText}>Track Meals</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.searchButton} onPress={onOpenFoodSearch}>
          <Text style={styles.buttonText}>Search Foods</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.inventoryButton} onPress={onOpenInventory}>
          <Text style={styles.buttonText}>Inventory</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shoppingListButton} onPress={onOpenShoppingList}>
          <Text style={styles.buttonText}>Shopping List</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.editButton} onPress={onEdit}>
          <Text style={styles.buttonText}>Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    color: "#999",
    marginBottom: 20,
  },
  errorContainer: {
    backgroundColor: "#FFE5E5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#FF3B30",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 14,
    marginBottom: 4,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#333",
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  disabled: {
    backgroundColor: "#f5f5f5",
  },
  dropdownButtonText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 12,
    color: "#999",
  },
  dropdownMenu: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: "#fff",
    zIndex: 1000,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  dropdownItemSelected: {
    backgroundColor: "#E3F2FD",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#333",
  },
  dropdownItemTextSelected: {
    color: "#007AFF",
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  profileCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  targetRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  targetLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  targetValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007AFF",
  },
  targetValueHighlight: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#34C759",
  },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  macroBox: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  macroValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  macroDetail: {
    fontSize: 11,
    color: "#999",
  },
  buttonGroup: {
    gap: 12,
    marginBottom: 20,
  },
  mealButton: {
    backgroundColor: "#FF9500",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  searchButton: {
    backgroundColor: "#5856D6",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  inventoryButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  shoppingListButton: {
    backgroundColor: "#34C759",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  editButton: {
    backgroundColor: "#34C759",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  logoutButton: {
    backgroundColor: "#FF3B30",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
});


