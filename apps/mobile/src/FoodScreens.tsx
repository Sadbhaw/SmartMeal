import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  FlatList,
  Alert,
} from "react-native";
import { foodClient, Food, FoodCategory } from "./foodClient";

interface FoodSearchScreenProps {
  onFoodSelected: (food: Food) => void;
  onCancel: () => void;
}

export const FoodSearchScreen: React.FC<FoodSearchScreenProps> = ({ onFoodSelected, onCancel }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    setOffset(0);
    setFoods([]);
    if (searchQuery.length > 0 || selectedCategory !== undefined) {
      searchFoods(0);
    }
  }, [searchQuery, selectedCategory]);

  const loadCategories = async () => {
    try {
      setIsLoadingCategories(true);
      setError(null);
      const cats = await foodClient.getCategories();
      setCategories(cats);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load categories";
      setError(message);
      Alert.alert("Error", message);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const searchFoods = async (newOffset: number) => {
    try {
      setError(null);
      setIsLoading(true);
      const result = await foodClient.searchFoods(searchQuery, selectedCategory, 50, newOffset);
      if (newOffset === 0) {
        setFoods(result.foods);
      } else {
        setFoods([...foods, ...result.foods]);
      }
      setOffset(newOffset);
      setHasMore(result.pagination.hasMore);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Search failed";
      setError(message);
      Alert.alert("Error", message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      searchFoods(offset + 50);
    }
  };

  const renderFoodItem = ({ item }: { item: Food }) => (
    <TouchableOpacity
      style={styles.foodItem}
      onPress={() => onFoodSelected(item)}
    >
      <View style={styles.foodItemContent}>
        <Text style={styles.foodName}>{item.name}</Text>
        <Text style={styles.foodServing}>
          {item.serving_size} {item.serving_unit}
        </Text>
        <Text style={styles.foodCalories}>{Math.round(item.calories_per_serving)} kcal</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Search Foods</Text>
        <TouchableOpacity onPress={onCancel}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search food by name..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>

      {isLoadingCategories ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <>
          <ScrollView style={styles.categoriesScroll} horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.categoryButton, selectedCategory === undefined && styles.categoryButtonActive]}
              onPress={() => setSelectedCategory(undefined)}
            >
              <Text
                style={[styles.categoryButtonText, selectedCategory === undefined && styles.categoryButtonTextActive]}
              >
                All
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryButton, selectedCategory === cat.id && styles.categoryButtonActive]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    selectedCategory === cat.id && styles.categoryButtonTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {foods.length === 0 && !isLoading && !error && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery || selectedCategory ? "No foods found" : "Search or select a category"}
              </Text>
            </View>
          )}

          <FlatList
            data={foods}
            renderItem={renderFoodItem}
            keyExtractor={(item) => item.id.toString()}
            style={styles.foodList}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isLoading && foods.length > 0 ? <ActivityIndicator size="small" color="#007AFF" style={styles.footerLoader} /> : null
            }
          />
        </>
      )}
    </View>
  );
};

interface FoodDetailScreenProps {
  food: Food;
  onBack: () => void;
}

export const FoodDetailScreen: React.FC<FoodDetailScreenProps> = ({ food, onBack }) => {
  const formatNumber = (num: number) => Math.round(num * 100) / 100;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.detailTitle}>{food.name}</Text>
      </View>

      <View style={styles.detailCard}>
        <Text style={styles.cardTitle}>Serving Information</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Serving Size:</Text>
          <Text style={styles.detailValue}>
            {formatNumber(food.serving_size)} {food.serving_unit}
          </Text>
        </View>
      </View>

      <View style={styles.detailCard}>
        <Text style={styles.cardTitle}>Nutrition per Serving</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Calories:</Text>
          <Text style={styles.detailValueHighlight}>{Math.round(food.calories_per_serving)} kcal</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Protein:</Text>
          <Text style={styles.detailValue}>{formatNumber(food.protein_g)} g</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Carbohydrates:</Text>
          <Text style={styles.detailValue}>{formatNumber(food.carbohydrates_g)} g</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Fat:</Text>
          <Text style={styles.detailValue}>{formatNumber(food.fat_g)} g</Text>
        </View>
        {food.fiber_g !== null && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Fiber:</Text>
            <Text style={styles.detailValue}>{formatNumber(food.fiber_g)} g</Text>
          </View>
        )}
      </View>

      <View style={styles.macroGridDetail}>
        <View style={styles.macroBoxDetail}>
          <Text style={styles.macroValueDetail}>{formatNumber(food.protein_g)}g</Text>
          <Text style={styles.macroLabelDetail}>Protein</Text>
          <Text style={styles.macroCalorieDetail}>4 kcal/g</Text>
        </View>
        <View style={styles.macroBoxDetail}>
          <Text style={styles.macroValueDetail}>{formatNumber(food.carbohydrates_g)}g</Text>
          <Text style={styles.macroLabelDetail}>Carbs</Text>
          <Text style={styles.macroCalorieDetail}>4 kcal/g</Text>
        </View>
        <View style={styles.macroBoxDetail}>
          <Text style={styles.macroValueDetail}>{formatNumber(food.fat_g)}g</Text>
          <Text style={styles.macroLabelDetail}>Fat</Text>
          <Text style={styles.macroCalorieDetail}>9 kcal/g</Text>
        </View>
      </View>

      <View style={styles.spacer} />
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  cancelButton: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  searchBox: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#333",
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: "#007AFF",
  },
  categoryButtonText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  categoryButtonTextActive: {
    color: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
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
  foodList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  foodItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 4,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  foodItemContent: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  foodServing: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  foodCalories: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
  },
  arrow: {
    fontSize: 20,
    color: "#ccc",
    marginLeft: 8,
  },
  footerLoader: {
    marginVertical: 16,
  },
  detailHeader: {
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
  detailTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  detailCard: {
    margin: 16,
    padding: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
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
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  detailValueHighlight: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#34C759",
  },
  macroGridDetail: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  macroBoxDetail: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  macroValueDetail: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 4,
  },
  macroLabelDetail: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  macroCalorieDetail: {
    fontSize: 11,
    color: "#999",
  },
  spacer: {
    height: 32,
  },
});
