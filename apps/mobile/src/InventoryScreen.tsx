import { useCallback, useEffect, useState } from 'react';
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
} from 'react-native';
import DateTimePicker, {
  DateTimePickerChangeEvent,
} from '@react-native-community/datetimepicker';
import {
  createInventoryItem,
  deleteInventoryItem,
  getInventory,
  updateInventoryItem,
  type InventoryItem,
  type InventoryItemInput,
} from './groceryClient';
import { formatExpiryDate } from './groceryDateUtils';

type ItemStatus = 'expired' | 'expiring' | 'in_stock' | 'out_of_stock';

function getStatus(item: InventoryItem): ItemStatus {
  if (item.quantity <= 0) return 'out_of_stock';
  if (item.expiry_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = parseDateOnly(item.expiry_date);
    if (expiry < today) return 'expired';
    const diffDays = (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 7) return 'expiring';
  }
  return 'in_stock';
}

const STATUS_META: Record<ItemStatus, { label: string; color: string }> = {
  expired: { label: 'Expired', color: '#dc2626' },
  expiring: { label: 'Expiring Soon', color: '#d97706' },
  in_stock: { label: 'In Stock', color: '#16a34a' },
  out_of_stock: { label: 'Out of Stock', color: '#6b7280' },
};

// Parse a "YYYY-MM-DD" date-only string as local midnight. Using the Date
// constructor directly (new Date("YYYY-MM-DD")) treats the value as UTC,
// which shifts the day in timezones west of UTC.
function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

// Format a Date object to "YYYY-MM-DD" using local date components.
// This avoids timezone shifts that would occur with toISOString().
function toDateOnlyString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Parse a "YYYY-MM-DD" string into a Date at local midnight for the picker.
// Returns null if the string is empty or invalid.
function parseExpiryToPickerDate(value: string): Date | null {
  if (!value) return null;
  const match = value.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

function formatDate(value: string | null): string {
  if (!value) return '';
  return formatExpiryDate(value) ?? value;
}

interface FormState {
  name: string;
  quantity: string;
  unit: string;
  expiry_date: string;
  notes: string;
  food_id: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  quantity: '1',
  unit: 'pcs',
  expiry_date: '',
  notes: '',
  food_id: '',
};

export const InventoryScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getInventory();
      setItems(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load inventory');
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
    setShowDatePicker(false);
    setModalOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      quantity: String(item.quantity),
      unit: item.unit,
      expiry_date: item.expiry_date || '',
      notes: item.notes || '',
      food_id: item.food_id ? String(item.food_id) : '',
    });
    setShowDatePicker(false);
    setModalOpen(true);
  };

  const openDatePicker = () => {
    setPickerMode('date');
    setShowDatePicker(true);
  };

  const handleDatePickerChange = (
    _event: DateTimePickerChangeEvent,
    date: Date,
  ) => {
    setForm({ ...form, expiry_date: toDateOnlyString(date) });
    setShowDatePicker(false);
  };

  const handleDatePickerDismiss = () => {
    setShowDatePicker(false);
  };

  const clearExpiryDate = () => {
    setForm({ ...form, expiry_date: '' });
  };

  const buildInput = (): InventoryItemInput => ({
    name: form.name.trim(),
    quantity: Number(form.quantity),
    unit: form.unit.trim() || 'pcs',
    expiry_date: form.expiry_date.trim() || null,
    notes: form.notes.trim() || null,
    food_id: form.food_id.trim() ? Number(form.food_id) : null,
  });

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Error', 'Name is required.');
      return;
    }
    const quantity = Number(form.quantity);
    if (form.quantity.trim() === '' || !Number.isFinite(quantity) || quantity < 0) {
      Alert.alert('Error', 'Quantity must be a number greater than or equal to 0.');
      return;
    }
    setSaving(true);
    try {
      const input = buildInput();
      if (editing) {
        await updateInventoryItem(editing.id, input);
      } else {
        await createInventoryItem(input);
      }
      setModalOpen(false);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save item.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteInventoryItem(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to delete item.');
    }
  };

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const status = getStatus(item);
    const meta = STATUS_META[status];
    return (
      <Pressable style={styles.card} onPress={() => openEdit(item)}>
        <View style={styles.cardHeader}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View style={[styles.badge, { backgroundColor: meta.color + '22' }]}>
            <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
        <Text style={styles.itemMeta}>
          {item.quantity} {item.unit}
          {item.expiry_date ? ` · Expires ${formatDate(item.expiry_date)}` : ''}
        </Text>
        {item.notes ? <Text style={styles.itemNotes}>{item.notes}</Text> : null}
        <Pressable
          style={styles.deleteBtn}
          onPress={() => setDeleteTarget(item)}
        >
          <Text style={styles.deleteBtnText}>Delete</Text>
        </Pressable>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Inventory</Text>
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
              <Text style={styles.emptyTitle}>No inventory items</Text>
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
            <Text style={styles.modalTitle}>{editing ? 'Edit Item' : 'Add Item'}</Text>

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

            <Text style={styles.label}>Expiry Date</Text>
            <View style={styles.row}>
              <Pressable
                style={[styles.input, styles.dateInput, { flex: 1 }]}
                onPress={openDatePicker}
              >
                <Text style={form.expiry_date ? styles.dateValue : styles.datePlaceholder}>
                  {form.expiry_date ? formatExpiryDate(form.expiry_date) || form.expiry_date : 'Tap to select date'}
                </Text>
              </Pressable>
              {form.expiry_date ? (
                <Pressable
                  style={styles.clearBtn}
                  onPress={clearExpiryDate}
                  hitSlop={8}
                >
                  <Text style={styles.clearBtnText}>Clear</Text>
                </Pressable>
              ) : null}
            </View>
            {showDatePicker ? (
              <DateTimePicker
                value={parseExpiryToPickerDate(form.expiry_date) || new Date()}
                mode={pickerMode}
                display="default"
                onValueChange={handleDatePickerChange}
                onDismiss={handleDatePickerDismiss}
              />
            ) : null}

            <Text style={styles.label}>Food ID (optional)</Text>
            <TextInput
              style={styles.input}
              value={form.food_id}
              onChangeText={(v) => setForm({ ...form, food_id: v })}
              keyboardType="numeric"
              placeholder="Link to a food item"
            />

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
              value={form.notes}
              onChangeText={(v) => setForm({ ...form, notes: v })}
              placeholder="Optional notes"
              multiline
            />

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
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Item'}
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
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  backButton: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: '600',
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  listContent: { padding: 16, paddingBottom: 100 },
  spinner: { marginTop: 40 },
  errorBox: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: '#dc2626', fontSize: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemName: { fontSize: 16, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  itemMeta: { fontSize: 14, color: '#4b5563' },
  itemNotes: { fontSize: 13, color: '#6b7280', marginTop: 4, fontStyle: 'italic' },
  deleteBtn: {
    marginTop: 10,
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  deleteBtnText: { color: '#dc2626', fontWeight: '600', fontSize: 13 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6b7280' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#2563eb',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '85%',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  dateInput: {
    justifyContent: 'center',
  },
  dateValue: { fontSize: 15, color: '#111827' },
  datePlaceholder: { fontSize: 15, color: '#9ca3af' },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
  },
  clearBtnText: { color: '#dc2626', fontWeight: '600', fontSize: 13 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  cancelBtnText: { color: '#374151', fontWeight: '600' },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  confirmCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    margin: 24,
  },
  confirmTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  confirmText: { fontSize: 14, color: '#4b5563', marginBottom: 8 },
  deleteConfirmBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#dc2626',
  },
  deleteConfirmText: { color: '#fff', fontWeight: '700' },
});