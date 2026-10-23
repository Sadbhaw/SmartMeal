import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./AuthContext";
import { LoginScreen, RegisterScreen } from "./AuthScreens";
import { ProfileFormScreen, ProfileDisplayScreen } from "./ProfileScreens";
import { FoodSearchScreen, FoodDetailScreen } from "./FoodScreens";
import { MealTrackingScreen } from "./MealScreens";
import { InventoryScreen } from "./InventoryScreen";
import { ShoppingListScreen } from "./ShoppingListScreen";
import { profileClient, ProfileData } from "./profileClient";
import { Food } from "./foodClient";

type Screen = "profile-form" | "profile-display" | "food-search" | "food-detail" | "meal-tracking" | "inventory" | "shopping-list";

const MainFlow: React.FC = () => {
  const { userEmail, logout, isLoading: authLoading } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>("profile-form");
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setError(null);
      const profile = await profileClient.getProfile();
      setProfileData(profile);
      setIsEditing(false);
      setCurrentScreen("profile-display");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message === "Profile not found") {
        setProfileData(null);
        setIsEditing(false);
        setCurrentScreen("profile-form");
      } else {
        setError(message);
        setCurrentScreen("profile-display");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileCreated = (profile: ProfileData) => {
    setProfileData(profile);
    setIsEditing(false);
    setCurrentScreen("profile-display");
  };

  const handleEdit = () => {
    setIsEditing(true);
    setCurrentScreen("profile-form");
  };

  const handleLogout = async () => {
    try {
      await logout();
      setProfileData(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleOpenFoodSearch = () => {
    setCurrentScreen("food-search");
  };

  const handleFoodSelected = (food: Food) => {
    setSelectedFood(food);
    setCurrentScreen("food-detail");
  };

  const handleBackFromFoodDetail = () => {
    setCurrentScreen("food-search");
  };

  const handleBackFromFoodSearch = () => {
    setCurrentScreen("profile-display");
  };

  const handleOpenMealTracking = () => {
    setCurrentScreen("meal-tracking");
  };

  const handleBackFromMealTracking = () => {
    setCurrentScreen("profile-display");
  };

  const handleOpenInventory = () => {
    setCurrentScreen("inventory");
  };

  const handleBackFromInventory = () => {
    setCurrentScreen("profile-display");
  };

  const handleOpenShoppingList = () => {
    setCurrentScreen("shopping-list");
  };

  const handleBackFromShoppingList = () => {
    setCurrentScreen("profile-display");
  };

  if (authLoading || isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error && currentScreen === "profile-display") {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorMessage}>{error}</Text>
      </View>
    );
  }

  if (currentScreen === "meal-tracking") {
    return (
      <MealTrackingScreen
        onBack={handleBackFromMealTracking}
      />
    );
  }

  if (currentScreen === "inventory") {
    return <InventoryScreen onBack={handleBackFromInventory} />;
  }

  if (currentScreen === "shopping-list") {
    return <ShoppingListScreen onBack={handleBackFromShoppingList} />;
  }

  if (currentScreen === "food-search") {
    return (
      <FoodSearchScreen
        onFoodSelected={handleFoodSelected}
        onCancel={handleBackFromFoodSearch}
      />
    );
  }

  if (currentScreen === "food-detail" && selectedFood) {
    return (
      <FoodDetailScreen
        food={selectedFood}
        onBack={handleBackFromFoodDetail}
      />
    );
  }

  if (!profileData || isEditing) {
    return (
      <ProfileFormScreen
        onProfileCreated={handleProfileCreated}
      />
    );
  }

  return (
    <ProfileDisplayScreen
      profile={profileData}
      onEdit={handleEdit}
      onLogout={handleLogout}
      onOpenFoodSearch={handleOpenFoodSearch}
      onOpenMealTracking={handleOpenMealTracking}
      onOpenInventory={handleOpenInventory}
      onOpenShoppingList={handleOpenShoppingList}
    />
  );
};

const AuthFlow: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (isAuthenticated) {
    return <MainFlow />;
  }

  return isLogin ? (
    <LoginScreen onSwitchToRegister={() => setIsLogin(false)} />
  ) : (
    <RegisterScreen onSwitchToLogin={() => setIsLogin(true)} />
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AuthFlow />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FF3B30",
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});
