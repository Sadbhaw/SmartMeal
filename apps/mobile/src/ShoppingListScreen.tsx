import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ShoppingListItem,
  getShoppingListItems,
  createShoppingListItem,
  updateShoppingListItem,
  deleteShoppingListItem,
} from "./shoppingListClient";

interface Props {
  onBack: () => void;
}

interface FormState {
  name: string;
  quantity: string;
  unit: string;
}

const EMPTY_FORM: FormState = { name: "", quantity: "", unit: "" };

export const ShoppingListScreen: React.FC<Props> = ({ onBack }) => {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ShoppingListItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ShoppingListItem | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await getShoppingListItems();
      setItems(data);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load shopping list.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (item: ShoppingListItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      quantity: item.quantity_value === null ? "" : String(item.quantity_value),
      unit: item.quantity_unit || "",
    });
    setModalOpen(true);
  };

  const buildInput = () => {
    const quantityTrimmed = form.quantity.trim();
    const quantityValue = quantityTrimmed === "" ? null : Number(quantityTrimmed);
    return {
      name: form.name.trim(),
      quantity_value: quantityValue,
      quantity_unit: form.unit.trim() || null,
      is_checked: editing?.is_checked ?? false,
    };
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert("Error", "Name is required.");
      return;
    }
    const quantityTrimmed = form.quantity.trim();
    if (quantityTrimmed !== "") {
      const quantity = Number(quantityTrimmed);
      if (!Number.isFinite(quantity) || quantity < 0) {
        Alert.alert("Error", "Quantity must be a number greater than or equal to 0.");
        return;
      }
    }
    setSaving(true);
    try {
      const input = buildInput();
      if (editing) {
        await updateShoppingListItem(editing.id, input);
      } else {
        await createShoppingListItem(input);
      }
      setModalOpen(false);
      await load();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to save item.");
    } finally {
      setSaving(false);
    }
  };

  const toggleChecked = async (item: ShoppingListItem) => {
    try {
      await updateShoppingListItem(item.id, {
        name: item.name,
        quantity_value:
          item.quantity_value === null ? null : Number(item.quantity_value),
        quantity_unit: item.quantity_unit,
        is_checked: !item.is_checked,
      });
      await load();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to update item.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteShoppingListItem(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to delete item.");
    }
  };

  const renderItem = ({ item }: { item: ShoppingListItem }) => (
    <Pressable
      style={[styles.card, item.is_checked && styles.cardChecked]}
      onPress={() => openEdit(item)}
    >
      <View style={styles.cardRow}>
        <Pressable
          style={[styles.checkbox, item.is_checked && styles.checkboxChecked]}
          onPress={() => toggleChecked(item)}
        >
          {item.is_checked ? <Text style={styles.checkboxMark}>✓</Text> : null}
        </Pressable>
        <View style={styles.cardBody}>
          <Text style={[styles.itemName, item.is_checked && styles.itemNameChecked]}>
            {item.name}
          </Text>
          {item.quantity_value !== null ? (
            <Text style={styles.itemMeta}>
              {item.quantity_value}
              {item.quantity_unit ? ` ${item.quantity_unit}` : ""}
            </Text>
          ) : null}
        </View>
        <Pressable style={styles.deleteBtn} onPress={() => setDeleteTarget(item)}>
          <Text style={styles.deleteBtnText}>Delete</Text>
        </Pressable>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Shopping List</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" style={styles.spinner} />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No shopping list items</Text>
              <Text style={styles.emptyText}>Tap "Add Item" to get started.</Text>
            </View>
          )
        }
        ListHeaderComponent={
          error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null
        }
      />

      <Pressable style={styles.fab} onPress={openCreate}>
        <Text style={styles.fabText}>+ Add Item</Text>
      </Pressable>

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? "Edit Item" : "Add Item"}</Text>

            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(v) => setForm({ ...form, name: v })}
              placeholder="e.g. Milk"
            />

            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>Quantity</Text>
                <TextInput
                  style={styles.input}
                  value={form.quantity}
                  onChangeText={(v) => setForm({ ...form, quantity: v })}
                  keyboardType="numeric"
                  placeholder="Optional"
                />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>Unit</Text>
                <TextInput
                  style={styles.input}
                  value={form.unit}
                  onChangeText={(v) => setForm({ ...form, unit: v })}
                  placeholder="pcs, kg, L"
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>
                  {saving ? "Saving…" : editing ? "Save Changes" : "Add Item"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!deleteTarget} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Delete Item?</Text>
            <Text style={styles.confirmText}>
              Are you sure you want to delete "{deleteTarget?.name}"?
            </Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setDeleteTarget(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.deleteConfirmBtn} onPress={confirmDelete}>
                <Text style={styles.deleteConfirmText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  backButton: {
    fontSize: 24,
    color: "#007AFF",
    fontWeight: "600",
    marginRight: 12,
  },
  title: { fontSize: 20, fontWeight: "700", color: "#111827" },
  listContent: { padding: 16, paddingBottom: 100 },
  spinner: { marginTop: 40 },
  empty: { alignItems: "center", marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#374151" },
  emptyText: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  errorBox: {
    backgroundColor: "#FFE5E5",
    borderLeftWidth: 4,
    borderLeftColor: "#FF3B30",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: "#FF3B30", fontSize: 14 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardChecked: { opacity: 0.6 },
  cardRow: { flexDirection: "row", alignItems: "center" },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  checkboxChecked: { backgroundColor: "#007AFF" },
  checkboxMark: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cardBody: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: "600", color: "#111827" },
  itemNameChecked: { textDecorationLine: "line-through", color: "#6b7280" },
  itemMeta: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#FFE5E5",
  },
  deleteBtnText: { color: "#FF3B30", fontWeight: "600", fontSize: 13 },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  fabText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#fff",
    marginBottom: 12,
  },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  cancelBtnText: { color: "#374151", fontWeight: "600" },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#007AFF",
  },
  saveBtnText: { color: "#fff", fontWeight: "700" },
  confirmCard: {
    backgroundColor: "#fff",
    margin: 24,
    borderRadius: 16,
    padding: 24,
  },
  confirmTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 8 },
  confirmText: { fontSize: 14, color: "#6b7280", marginBottom: 16 },
  deleteConfirmBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#FF3B30",
  },
  deleteConfirmText: { color: "#fff", fontWeight: "700" },
});


