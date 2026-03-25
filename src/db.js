import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "./firebase";

const INVENTORY_COLLECTION = "inventory";

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

// Utility: Parse currency string to number
export const parseCurrency = (value) => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  return parseFloat(String(value).replace(/[₱,]/g, '')) || 0;
};

// Utility: Format number to currency string
export const formatCurrency = (amount) => {
  return '₱' + (parseFloat(amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
