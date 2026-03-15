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
