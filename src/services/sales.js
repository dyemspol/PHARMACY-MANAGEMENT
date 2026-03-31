import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "../firebase.js";

const SALES_COLLECTION = "salesHistory";

// Get sales history with real-time updates
export const fetchSalesData = (callback) => {
  const q = query(collection(db, SALES_COLLECTION), orderBy("createdAt", "desc"));
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const sales = [];
    querySnapshot.forEach((doc) => {
      sales.push({
        id: doc.id,
        ...doc.data()
      });
    });
    callback(sales);
  }, (error) => {
    console.error("Error fetching sales data: ", error);
    alert("Firestore Error: " + error.message + ". Please refresh the page.");
  });
  return unsubscribe; 
};

// Save a new completed sale transaction
export const saveSaleData = async (saleData) => {
  try {
    const docRef = await addDoc(collection(db, SALES_COLLECTION), saleData);
    return docRef.id;
  } catch (error) {
    console.error("Error saving sale transaction: ", error);
    throw error;
  }
};
// Update a sale transaction status (e.g. mark as refunded)
export const updateSaleStatus = async (saleId, status) => {
  try {
    const saleRef = doc(db, SALES_COLLECTION, saleId);
    await updateDoc(saleRef, { status: status });
    return true;
  } catch (error) {
    console.error("Error updating sale status: ", error);
    throw error;
  }
};

// Update partial refund for a specific item in a sale
export const updateSaleItemRefund = async (saleId, items, overallStatus) => {
  try {
    const saleRef = doc(db, SALES_COLLECTION, saleId);
    await updateDoc(saleRef, { 
      items: items,
      status: overallStatus 
    });
    return true;
  } catch (error) {
    console.error("Error updating partial refund: ", error);
    throw error;
  }
};
// Delete all records from salesHistory (Reset Sales)
export const clearSalesHistory = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, SALES_COLLECTION));
    const deletePromises = [];
    querySnapshot.forEach((document) => {
      deletePromises.push(deleteDoc(doc(db, SALES_COLLECTION, document.id)));
    });
    await Promise.all(deletePromises);
    return true;
  } catch (error) {
    console.error("Error clearing sales history: ", error);
    throw error;
  }
};
