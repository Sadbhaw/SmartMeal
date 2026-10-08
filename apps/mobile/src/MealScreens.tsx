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
  FlatList,
} from "react-native";
import { mealClient, MealType, MealEntryWithDetails, DailyNutritionSummary } from "./mealClient";
import { profileClient, ProfileData } from "./profileClient";
import { foodClient, Food } from "./foodClient";


export const getTodayDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const addDays = (dateStr: string, days: number): string => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dayStr = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayStr}`;
};

export const isNextDateDisabled = (selectedDate: string, todayDate?: string): boolean => {
  const today = todayDate || getTodayDateString();
  return selectedDate >= today;
};

export const getNextNavDate = (selectedDate: string, todayDate?: string): string | null => {
  const today = todayDate || getTodayDateString();
  if (selectedDate >= today) return null;
  const nextDate = addDays(selectedDate, 1);
  return nextDate <= today ? nextDate : null;
};

interface MealTrackingScreenProps {
  onBack: () => void;
}

export const MealTrackingScreen: React.FC<MealTrackingScreenProps> = ({ onBack }) => {
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [meals, setMeals] = useState<MealEntryWithDetails[]>([]);
  const [summary, setSummary] = useState<DailyNutritionSummary | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [mealsData, summaryData, profileData] = await Promise.all([
        mealClient.getMealsForDate(selectedDate),
        mealClient.getDailyNutritionSummary(selectedDate),
        profileClient.getProfile(),
      ]);

      setMeals(mealsData);
      setSummary(summaryData);
      setProfile(profileData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load meals";
      setError(message);
      Alert.alert("Error", message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviousDay = () => {
    setSelectedDate(addDays(selectedDate, -1));
  };

  const handleNextDay = () => {
    const nextDate = getNextNavDate(selectedDate);
    if (nextDate) {
      setSelectedDate(nextDate);
    }
  };

  const handleDeleteMeal = async (entryId: number) => {
    Alert.alert("Delete Meal", "Are you sure you want to delete this meal?", [
      { text: "Cancel", onPress: () => {} },
      {
        text: "Delete",
        onPress: async () => {
          try {
            await mealClient.deleteMealEntry(entryId);
            await loadData();
          } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to delete meal";
            Alert.alert("Error", message);
          }
        },
      },
    ]);
  };

  const handleEditMeal = (entryId: number) => {
    setEditingEntryId(entryId);
    setShowAddForm(true);
  };

  const handleAddComplete = async () => {
    setShowAddForm(false);
    setEditingEntryId(null);
    await loadData();
  };

  const isToday = selectedDate === getTodayDateString();
  const isNextDisabled = isNextDateDisabled(selectedDate);
  const isEditingMode = editingEntryId !== null;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (showAddForm) {
    return (
      <AddMealForm
        selectedDate={selectedDate}
        editingEntryId={editingEntryId}
        onComplete={handleAddComplete}
        onCancel={() => {
          setShowAddForm(false);
          setEditingEntryId(null);
        }}
      />
    );
  }

  const mealsByType: { [key: string]: MealEntryWithDetails[] } = {};
  meals.forEach((meal) => {
    if (!mealsByType[meal.meal_type_name]) {
      mealsByType[meal.meal_type_name] = [];
    }
    mealsByType[meal.meal_type_name].push(meal);
  });

  const formatNumber = (num: number) => Math.round(num);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Today's Meals</Text>
      </View>

      <View style={styles.dateNav}>
        <TouchableOpacity onPress={handlePreviousDay}>
          <Text style={styles.dateNavButton}>‹ Previous</Text>
        </TouchableOpacity>
        <Text style={styles.dateText}>{selectedDate}</Text>
        <TouchableOpacity onPress={handleNextDay} disabled={isNextDisabled}>
          <Text style={[styles.dateNavButton, isNextDisabled && styles.disabled]}>Next ›</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {summary && (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Daily Nutrition Summary</Text>
            
            <View style={styles.summaryRow}>
              <View style={styles.summaryColumn}>
                <Text style={styles.summaryLabel}>Calories</Text>
                <Text style={styles.summaryValue}>{formatNumber(summary.consumed.calories)} kcal</Text>
                {summary.targets && summary.remaining && (
                  <Text style={styles.summaryTarget}>
                    Target: {formatNumber(summary.targets.calories)} | Rem: {formatNumber(summary.remaining.calories)}
                  </Text>
                )}
              </View>
              <View style={styles.summaryColumn}>
                <Text style={styles.summaryLabel}>Protein</Text>
                <Text style={styles.summaryValue}>{formatNumber(summary.consumed.protein_g)}g</Text>
                {summary.targets && summary.remaining && (
                  <Text style={styles.summaryTarget}>
                    Target: {formatNumber(summary.targets.protein_g)}g | Rem: {formatNumber(summary.remaining.protein_g)}g
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryColumn}>
                <Text style={styles.summaryLabel}>Carbs</Text>
                <Text style={styles.summaryValue}>{formatNumber(summary.consumed.carbohydrates_g)}g</Text>
                {summary.targets && summary.remaining && (
                  <Text style={styles.summaryTarget}>
                    Target: {formatNumber(summary.targets.carbohydrates_g)}g | Rem: {formatNumber(summary.remaining.carbohydrates_g)}g
                  </Text>
                )}
              </View>
              <View style={styles.summaryColumn}>
                <Text style={styles.summaryLabel}>Fat</Text>
                <Text style={styles.summaryValue}>{formatNumber(summary.consumed.fat_g)}g</Text>
                {summary.targets && summary.remaining && (
                  <Text style={styles.summaryTarget}>
                    Target: {formatNumber(summary.targets.fat_g)}g | Rem: {formatNumber(summary.remaining.fat_g)}g
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.summaryRowFull}>
              <Text style={styles.summaryLabel}>Fiber</Text>
              <Text style={styles.summaryValue}>{formatNumber(summary.consumed.fiber_g)}g</Text>
            </View>
          </View>

          {Object.keys(mealsByType).length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No meals logged for this day</Text>
            </View>
          ) : (
            <View style={styles.mealsContainer}>
              {["Breakfast", "Lunch", "Dinner", "Snacks"].map((mealType) => {
                const mealEntries = mealsByType[mealType] || [];
                if (mealEntries.length === 0) return null;

                return (
                  <View key={mealType} style={styles.mealTypeSection}>
                    <Text style={styles.mealTypeTitle}>{mealType}</Text>
                    {mealEntries.map((entry) => (
                      <View key={entry.id} style={styles.mealEntry}>
                        <View style={styles.mealEntryContent}>
                          <Text style={styles.mealFoodName}>{entry.food_name}</Text>
                          <Text style={styles.mealQuantity}>
                            {entry.quantity_value} {entry.quantity_unit}
                          </Text>
                          <View style={styles.mealNutrition}>
                            <Text style={styles.mealNutritionItem}>
                              {formatNumber(entry.calories)} kcal
                            </Text>
                            <Text style={styles.mealNutritionItem}>
                              P: {formatNumber(entry.protein_g)}g
                            </Text>
                            <Text style={styles.mealNutritionItem}>
                              C: {formatNumber(entry.carbohydrates_g)}g
                            </Text>
                            <Text style={styles.mealNutritionItem}>
                              F: {formatNumber(entry.fat_g)}g
                            </Text>
                          </View>
                        </View>
                        <View style={styles.mealActions}>
                          <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => handleEditMeal(entry.id)}
                          >
                            <Text style={styles.actionButtonText}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDeleteMeal(entry.id)}
                          >
                            <Text style={styles.actionButtonText}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          )}

          {isToday && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddForm(true)}
            >
              <Text style={styles.addButtonText}>+ Add Meal</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </ScrollView>
  );
};

interface AddMealFormProps {
  selectedDate: string;
  editingEntryId: number | null;
  onComplete: () => void;
  onCancel: () => void;
}

const AddMealForm: React.FC<AddMealFormProps> = ({
  selectedDate,
  editingEntryId,
  onComplete,
  onCancel,
}) => {
  const [mealTypes, setMealTypes] = useState<MealType[]>([]);
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [foods, setFoods] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<MealEntryWithDetails | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const types = await mealClient.getMealTypes();
      setMealTypes(types);
      setSelectedMealType(types[0] || null);

      if (editingEntryId) {
        const entry = await mealClient.getMealEntryById(editingEntryId);
        setEditingEntry(entry);
        const mealType = types.find((t) => t.id === entry.meal_type_id);
        setSelectedMealType(mealType || types[0]);
        setQuantity(entry.quantity_value.toString());
        setSearchQuery(entry.food_name);
        setSelectedFood({
          id: entry.food_id,
          category_id: 0,
          name: entry.food_name,
          description: null,
          serving_size: entry.food_serving_size,
          serving_unit: entry.food_serving_unit,
          calories_per_serving: 0,
          protein_g: 0,
          carbohydrates_g: 0,
          fat_g: 0,
          fiber_g: null,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load data";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const searchFoods = async (query: string) => {
    if (query.length < 1) {
      setFoods([]);
      return;
    }

    try {
      const result = await foodClient.searchFoods(query, undefined, 30);
      setFoods(result.foods);
    } catch (err) {
      console.error("Search failed:", err);
    }
  };

  const handleSave = async () => {
    if (!selectedMealType || !selectedFood || !quantity) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setIsSaving(true);
    try {
      if (editingEntryId) {
        await mealClient.updateMealEntry(
          editingEntryId,
          selectedFood.id,
          selectedMealType.id,
          parseFloat(quantity),
          selectedFood.serving_unit,
          selectedDate
        );
      } else {
        await mealClient.createMealEntry(
          selectedFood.id,
          selectedMealType.id,
          parseFloat(quantity),
          selectedFood.serving_unit,
          selectedDate
        );
      }
      onComplete();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save meal";
      Alert.alert("Error", message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{editingEntryId ? "Edit Meal" : "Add Meal"}</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.formSection}>
        <Text style={styles.label}>Meal Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {mealTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.mealTypeButton,
                selectedMealType?.id === type.id && styles.mealTypeButtonActive,
              ]}
              onPress={() => setSelectedMealType(type)}
            >
              <Text
                style={[
                  styles.mealTypeButtonText,
                  selectedMealType?.id === type.id && styles.mealTypeButtonTextActive,
                ]}
              >
                {type.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.label}>Food</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search food..."
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            searchFoods(text);
          }}
        />

        {selectedFood && (
          <View style={styles.selectedFoodBox}>
            <Text style={styles.selectedFoodName}>{selectedFood.name}</Text>
            <Text style={styles.selectedFoodServing}>
              Serving: {selectedFood.serving_size} {selectedFood.serving_unit}
            </Text>
          </View>
        )}

        {foods.length > 0 && (
          <FlatList
            data={foods}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.foodSearchResult}
                onPress={() => {
                  setSelectedFood(item);
                  setSearchQuery(item.name);
                  setFoods([]);
                }}
              >
                <Text style={styles.foodName}>{item.name}</Text>
                <Text style={styles.foodServing}>
                  {item.serving_size} {item.serving_unit}
                </Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            style={styles.foodList}
          />
        )}
      </View>

      <View style={styles.formSection}>
        <Text style={styles.label}>
          Quantity ({selectedFood?.serving_unit || "unit"})
        </Text>
        <TextInput
          style={styles.input}
          placeholder="1"
          keyboardType="decimal-pad"
          value={quantity}
          onChangeText={setQuantity}
        />
      </View>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>
            {editingEntryId ? "Update Meal" : "Add Meal"}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    fontSize: 24,
    color: "#007AFF",
    fontWeight: "600",
    marginRight: 12,
  },
  cancelButton: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  dateNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f5f5f5",
  },
  dateNavButton: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  disabled: {
    color: "#ccc",
  },
  dateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  errorContainer: {
    backgroundColor: "#FFE5E5",
    padding: 12,
    margin: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#FF3B30",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 14,
  },
  summaryCard: {
    margin: 16,
    padding: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryRowFull: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryColumn: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 2,
  },
  summaryTarget: {
    fontSize: 11,
    color: "#999",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
  mealsContainer: {
    paddingHorizontal: 16,
  },
  mealTypeSection: {
    marginBottom: 16,
  },
  mealTypeTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  mealEntry: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  mealEntryContent: {
    flex: 1,
  },
  mealFoodName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  mealQuantity: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  mealNutrition: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  mealNutritionItem: {
    fontSize: 11,
    color: "#666",
    backgroundColor: "#fff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  mealActions: {
    justifyContent: "center",
    gap: 4,
  },
  editButton: {
    backgroundColor: "#34C759",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  deleteButton: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  addButton: {
    marginHorizontal: 16,
    marginVertical: 20,
    paddingVertical: 14,
    backgroundColor: "#5856D6",
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  formSection: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  mealTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginRight: 8,
  },
  mealTypeButtonActive: {
    backgroundColor: "#007AFF",
  },
  mealTypeButtonText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  mealTypeButtonTextActive: {
    color: "#fff",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#333",
    marginBottom: 8,
  },
  selectedFoodBox: {
    backgroundColor: "#E3F2FD",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  selectedFoodName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
    marginBottom: 2,
  },
  selectedFoodServing: {
    fontSize: 12,
    color: "#666",
  },
  foodList: {
    maxHeight: 200,
    marginBottom: 8,
  },
  foodSearchResult: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#eee",
  },
  foodName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 2,
  },
  foodServing: {
    fontSize: 12,
    color: "#999",
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
  saveButton: {
    marginHorizontal: 16,
    marginVertical: 20,
    paddingVertical: 14,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
