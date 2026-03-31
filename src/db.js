import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, writeBatch } from "firebase/firestore";
import { db } from "./firebase";

const INVENTORY_COLLECTION = "inventory";
const CATEGORIES_COLLECTION = "categories";

// ────────── CATEGORY CRUD ──────────

const DEFAULT_CATEGORIES = ['Pain Relief', 'Antibiotics', 'Vitamins', 'Cardiovascular', 'First Aid', 'Medical Supplies'];

// Fetch all categories from Firestore (seeds defaults on first run)
export const getCategories = async () => {
  try {
    const snapshot = await getDocs(collection(db, CATEGORIES_COLLECTION));
    if (snapshot.empty) {
      // First run — seed defaults
      const batch = writeBatch(db);
      DEFAULT_CATEGORIES.forEach((name, i) => {
        const ref = doc(collection(db, CATEGORIES_COLLECTION));
        batch.set(ref, { name, order: i });
      });
      await batch.commit();
      return DEFAULT_CATEGORIES.map((name, i) => ({ name, order: i, id: null }));
    }
    const cats = [];
    snapshot.forEach(d => cats.push({ id: d.id, ...d.data() }));
    cats.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    return cats;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return DEFAULT_CATEGORIES.map(name => ({ name, id: null }));
  }
};

// Add a new category
export const saveCategory = async (name) => {
  try {
    const snapshot = await getDocs(collection(db, CATEGORIES_COLLECTION));
    const maxOrder = snapshot.docs.reduce((m, d) => Math.max(m, d.data().order ?? 0), 0);
    const ref = await addDoc(collection(db, CATEGORIES_COLLECTION), { name: name.trim(), order: maxOrder + 1 });
    return ref.id;
  } catch (error) {
    console.error("Error saving category:", error);
    throw error;
  }
};

// Rename a category — updates Firestore doc + all inventory items using the old name
export const updateCategoryName = async (id, oldName, newName) => {
  try {
    // 1. Update the category document itself
    if (id) await updateDoc(doc(db, CATEGORIES_COLLECTION, id), { name: newName.trim() });

    // 2. Update all inventory items that use the old category name
    const q = query(collection(db, INVENTORY_COLLECTION), where("category", "==", oldName));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const batch = writeBatch(db);
      snapshot.forEach(d => batch.update(d.ref, { category: newName.trim() }));
      await batch.commit();
    }
    return true;
  } catch (error) {
    console.error("Error renaming category:", error);
    throw error;
  }
};

// Delete a category
export const deleteCategory = async (id) => {
  try {
    if (id) await deleteDoc(doc(db, CATEGORIES_COLLECTION, id));
    return true;
  } catch (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
};



// Get all inventory items
export const fetchInventory = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, INVENTORY_COLLECTION));
    const items = [];
    querySnapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() });
    });
    items.sort((a, b) => a.name.localeCompare(b.name));
    return items;
  } catch (error) {
    console.error("Error fetching inventory: ", error);
    return [];
  }
};

// Add a new item
export const addInventoryItem = async (itemData) => {
  try {
    const docRef = await addDoc(collection(db, INVENTORY_COLLECTION), itemData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding inventory item: ", error);
    throw error;
  }
};

// Update an existing item (e.g. edit details or deduct stock)
export const updateInventoryItem = async (id, updatedData) => {
  try {
    const itemRef = doc(db, INVENTORY_COLLECTION, id);
    await updateDoc(itemRef, updatedData);
    return true;
  } catch (error) {
    console.error("Error updating inventory item: ", error);
    throw error;
  }
};

// Delete an item
export const deleteInventoryItem = async (id) => {
  try {
    const itemRef = doc(db, INVENTORY_COLLECTION, id);
    await deleteDoc(itemRef);
    return true;
  } catch (error) {
    console.error("Error deleting inventory item: ", error);
    throw error;
  }
};

// Utility: Parse stock string to number
export const parseStock = (stock) => {
  if (typeof stock === 'number') return stock;
  if (!stock) return 0;
  return parseInt(String(stock).replace(/ units/g, '').replace(/,/g, '')) || 0;
};

// Centralized Low Stock Check
export const isLowStock = (item) => {
  const stock = parseStock(item.stock);
  const threshold = parseInt(item.lowStockThreshold) || 50;
  return stock <= threshold;
};

// Get Stock Severity for UI coloring
export const getStockSeverity = (item) => {
  const stock = parseStock(item.stock);
  const threshold = parseInt(item.lowStockThreshold) || 50;
  if (stock <= 0) return 'critical-empty';
  if (stock <= (threshold * 0.4)) return 'critical-low';
  if (stock <= threshold) return 'low';
  return 'normal';
};

// Utility: Parse currency string to number
export const parseCurrency = (value) => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  return parseFloat(String(value).replace(/[^0-9.-]+/g, '')) || 0;
};

// Utility: Format number to currency string
export const formatCurrency = (amount) => {
  return '₱' + parseCurrency(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Return items to inventory (refund)
export const returnItemsToInventory = async (items) => {
  try {
    const inventorySnapshot = await getDocs(collection(db, INVENTORY_COLLECTION));
    const inventoryItems = [];
    inventorySnapshot.forEach((doc) => {
      inventoryItems.push({ id: doc.id, ...doc.data() });
    });

    for (const item of items) {
      // Find item by ID first, then by name
      let foundMed = inventoryItems.find(m => (item.id && m.id === item.id) || m.name === item.name);
      
      if (foundMed) {
        let currentStockNum = parseStock(foundMed.stock);
        let newStockNum = currentStockNum + (item.quantityPurchased || item.quantity || 0);
        let newStockStr = newStockNum + ' units';
        await updateInventoryItem(foundMed.id, { stock: newStockStr });
      } else {
        console.warn(`Could not find inventory item: ${item.name}`);
      }
    }
    return true;
  } catch (error) {
    console.error("Error returning items to inventory: ", error);
    throw error;
  }
};
