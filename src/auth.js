import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

const USERS_COLLECTION = "users";
const AUTH_KEY = 'pharmacy_session';

console.log('Auth Utility: Initializing with Firestore...');

window.auth = {
    // Initialize default admin if none exists in Firestore
    async initAdmin() {
        try {
            const adminDoc = doc(db, USERS_COLLECTION, 'admin');
            const docSnap = await getDoc(adminDoc);
            
            if (!docSnap.exists()) {
                console.log('Auth: Provisioning default administrator...');
                await setDoc(adminDoc, {
                    username: 'admin',
                    password: 'admin123',
                    role: 'admin',
                    name: 'Administrator',
                    createdAt: new Date().toISOString()
                });
                console.log('Auth: Default admin provisioned successfully.');
            } else {
                console.log('Auth: Primary administrator already exists in Firestore.');
            }
        } catch (error) {
            console.error('Auth: Error initializing admin:', error);
            if (error.code === 'permission-denied') {
                alert('Firebase Permission Denied: Please check your Firestore Security Rules.');
            }
        }
    },

    async getUsers() {
        try {
            const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
            const users = [];
            querySnapshot.forEach((doc) => {
                users.push({ id: doc.id, ...doc.data() });
            });
            console.log(`Auth: Loaded ${users.length} users from Firestore.`);
            return users;
        } catch (error) {
            console.error("Error fetching users:", error);
            alert("Failed to load users from database. Please check your internet connection.");
            return [];
        }
    },

    async saveUser(userData) {
        try {
            // Check if username already exists
            const q = query(collection(db, USERS_COLLECTION), where("username", "==", userData.username));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                throw new Error("Username already exists");
            }

            await addDoc(collection(db, USERS_COLLECTION), {
                ...userData,
                createdAt: new Date().toISOString()
            });
            return true;
        } catch (error) {
            console.error("Error saving user:", error);
            throw error;
        }
    },

    async deleteUser(username) {
        try {
            const q = query(collection(db, USERS_COLLECTION), where("username", "==", username));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach(async (docRef) => {
                await deleteDoc(doc(db, USERS_COLLECTION, docRef.id));
            });
            return true;
        } catch (error) {
            console.error("Error deleting user:", error);
            throw error;
        }
    },

    async login(username, password) {
        try {
            console.log(`Auth: Attempting login for user: ${username}...`);
            const q = query(collection(db, USERS_COLLECTION), 
                where("username", "==", username), 
                where("password", "==", password));
            
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0].data();
                const sessionData = {
                    username: userDoc.username,
                    role: userDoc.role,
                    name: userDoc.name,
                    loginTime: new Date().getTime()
                };
                localStorage.setItem(AUTH_KEY, JSON.stringify(sessionData));
                console.log('Auth: Login successful.');
                return true;
            }
            console.warn('Auth: Invalid credentials provided.');
            return false;
        } catch (error) {
            console.error("Login error:", error);
            alert("Database connection error during login: " + error.message);
            return false;
        }
    },

    logout() {
        localStorage.removeItem(AUTH_KEY);
        window.location.href = 'login.html';
    },

    isAuthenticated() {
        return !!localStorage.getItem(AUTH_KEY);
    },

    getCurrentUser() {
        const session = localStorage.getItem(AUTH_KEY);
        return session ? JSON.parse(session) : null;
    },

    checkAuth() {
        const user = this.getCurrentUser();
        const path = window.location.pathname;
        const isLoginPage = path.endsWith('login.html') || path.endsWith('/login');
        const isRoot = path === '/' || path === '/index.html' || path.endsWith('/');

        if (!user && !isLoginPage) {
            window.location.href = 'login.html';
        } else if (user && isLoginPage) {
            window.location.href = user.role === 'admin' ? 'index.html' : 'POST_terminal.html';
        } else if (user && user.role === 'employee') {
            const restrictedPages = ['index.html', 'inventory.html', 'accounts.html'];
            const currentPage = path.split('/').pop() || (isRoot ? 'index.html' : '');
            
            if (restrictedPages.includes(currentPage)) {
                window.location.href = 'POST_terminal.html';
            }
        }
    }
};

// Auto-run on load
window.auth.initAdmin().then(() => {
    window.auth.checkAuth();
});
