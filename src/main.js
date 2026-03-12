import './style.css'

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
  dateEl.innerText = new Date('2025-09-10').toLocaleDateString('en-US', options); 
  // Keep the date from the image: Wednesday, September 10, 2025
}

// Logic to re-run lucide icons if Alpine modifies the DOM
document.addEventListener('alpine:initialized', () => {
    // Watch for tab changes to ensure icons are rendered in dynamic components if any
});
