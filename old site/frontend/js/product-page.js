// Product Page JavaScript (Shared across all product category pages)
// Note: Add to Cart is now handled by unified-cart.js

// Sort products by price (low to high) on page load
document.addEventListener('DOMContentLoaded', function () {
    // Sort all sections by price
    sortAllSectionsByPrice();
    
    // Add to Cart is handled by unified-cart.js
    // This file now only handles sorting
});

// Function to sort all product sections by price (low to high)
function sortAllSectionsByPrice() {
    const sections = document.querySelectorAll('main section');

    sections.forEach(section => {
        // Get all mobile cards in this section
        const cards = Array.from(section.querySelectorAll('.mobile-card'));

        if (cards.length === 0) return;

        // Sort cards by price (low to high)
        cards.sort((a, b) => {
            const priceA = extractPrice(a);
            const priceB = extractPrice(b);
            return priceA - priceB;
        });

        // Reappend sorted cards to section
        cards.forEach(card => section.appendChild(card));
    });
}

// Extract numeric price from mobile card
function extractPrice(card) {
    const priceElement = card.querySelector('.mobile-price');
    if (!priceElement) return 0;

    // Extract number from text like "₹7,699" → 7699
    const priceText = priceElement.textContent.trim();
    const price = parseInt(priceText.replace(/[₹,]/g, '')) || 0;
    return price;
}
