function filterPhones(category) {
    const sections = document.querySelectorAll('main section');

    sections.forEach(section => {
        if (category === 'all' || section.classList.contains('phone' + category)) {
            section.style.display = 'grid';
        } else {
            section.style.display = 'none';
        }
    });
}

// Add to Cart is now handled by unified-cart.js
// This file only handles filtering
// Removed duplicate addToCart function to use unified system
/**
 * ============================================
 * RMDU Mobiles - Sort Cards by Price Utility
 * Automatically sorts mobile cards by price on static HTML pages
 * ============================================
 */

(function () {
    'use strict';

    /**
     * Sort mobile cards within each section by price
     */
    function sortCardsByPrice() {
        // Find all sections containing mobile cards
        const sections = document.querySelectorAll('main section');

        sections.forEach(section => {
            // Get all mobile cards within this section
            const cards = Array.from(section.querySelectorAll('.mobile-card'));

            if (cards.length === 0) return;

            // Sort cards by data-price attribute (ascending)
            cards.sort((a, b) => {
                const priceA = parseFloat(a.getAttribute('data-price')) || 0;
                const priceB = parseFloat(b.getAttribute('data-price')) || 0;
                return priceA - priceB;
            });

            // Remove all cards from section
            cards.forEach(card => card.remove());

            // Re-append cards in sorted order
            cards.forEach(card => section.appendChild(card));
        });
    }

    /**
     * Initialize sorting on page load
     */
    function init() {
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', sortCardsByPrice);
        } else {
            // DOM already loaded
            sortCardsByPrice();
        }
    }

    // Run initialization
    init();
})();
