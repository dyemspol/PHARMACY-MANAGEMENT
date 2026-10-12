import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = {
  apiKey: 'AIzaSyBmGOD-DxmtkJtLEYsV6xbzyR-_vHOGlKU',
  authDomain: 'pharmacy-inventory-953da.firebaseapp.com',
  projectId: 'pharmacy-inventory-953da',
  storageBucket: 'pharmacy-inventory-953da.firebasestorage.app',
  messagingSenderId: '865430151305',
  appId: '1:865430151305:web:398761a5de5172a2542658'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const invSnap = await getDocs(collection(db, 'inventory'));
const backup = [];
invSnap.forEach(d => {
  backup.push({ id: d.id, ...d.data() });
});

fs.writeFileSync('inventory_backup.json', JSON.stringify(backup, null, 2));
console.log(`Successfully backed up ${backup.length} items to inventory_backup.json`);
process.exit(0);
