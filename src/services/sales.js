import { collection, query, orderBy, onSnapshot, addDoc } from "firebase/firestore";
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
