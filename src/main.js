import './style.css'
import './firebase.js'
import * as db from './db.js'
import * as salesDb from './services/sales.js'

window.db = db;
window.salesDb = salesDb;

// Initialize icons on load
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

// Since we are using Alpine.js for some state, we don't need much JS here
// But we can add a simple search or notification trigger for demo purposes

console.log('DavaoDeOro Dashboard initialized');

// Add some dynamic behavior to the date
const dateEl = document.getElementById('current-date');
if (dateEl) {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  dateEl.innerText = new Date().toLocaleDateString('en-US', options); 
}

// Logic to re-run lucide icons if Alpine modifies the DOM
document.addEventListener('alpine:initialized', () => {
    if (window.lucide) {
        window.lucide.createIcons();
    }
});

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
