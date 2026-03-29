/**
 * ============================================
 * Master Backend Integration
 * Ensures all backend features work seamlessly
 * ============================================
 */

(function() {
    'use strict';

    // Initialize all backend integrations
    function initBackendIntegration() {
        // Load backend cart integration
        if (typeof BackendCartIntegration !== 'undefined') {
            window.backendCart = new BackendCartIntegration();
        }

        // Load backend filter integration
        if (typeof BackendFilterIntegration !== 'undefined') {
            window.backendFilter = new BackendFilterIntegration();
            window.backendFilter.loadFromURL();
        }

        // Check authentication status
        checkAuthStatus();

        // Setup product pages to fetch from backend
        setupProductPages();

        // Integrate search with backend
        setupSearchIntegration();
    }

    async function checkAuthStatus() {
        try {
            const response = await fetch('backend/auth_api.php?action=check');
            const data = await response.json();
            
            if (data.authenticated) {
                // Update UI for logged in user
                const loginBtn = document.getElementById('loginBtnLi');
                const logoutBtn = document.getElementById('logoutBtnLi');
                
                if (loginBtn) loginBtn.style.display = 'none';
                if (logoutBtn) logoutBtn.style.display = 'block';

                // Update user info if available
                if (data.user) {
                    window.currentUser = data.user;
                }
            }
        } catch (error) {
            console.log('Auth check failed, continuing without auth');
        }
    }

    function setupProductPages() {
        // Check if we're on a category page
        const categoryPages = ['BudgetKiller', 'GamingGuru', 'CameraChampion', 'BatteryBeast', 'GOATLegends'];
        const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
        
        if (categoryPages.includes(currentPage)) {
            const categoryMap = {
                'BudgetKiller': 'budget-killer',
                'GamingGuru': 'gaming-guru',
                'CameraChampion': 'camera-champion',
                'BatteryBeast': 'battery-beast',
                'GOATLegends': 'goat-legends'
            };

            const categorySlug = categoryMap[currentPage];
            
            // Fetch products from backend
            fetchProductsByCategory(categorySlug);
        }
    }

    async function fetchProductsByCategory(categorySlug) {
        try {
            const response = await fetch(`backend/get_products.php?category=${categorySlug}&limit=50`);
            const data = await response.json();

            if (data.status === 'success' && data.products) {
                // Render products
                renderProductsFromBackend(data.products);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            // Fallback to existing product display
        }
    }

    function renderProductsFromBackend(products) {
        const container = document.querySelector('.phone-grid') || 
                         document.querySelector('main section') ||
                         document.querySelector('main');

        if (!container) return;

        // Clear existing static products if any
        const existingCards = container.querySelectorAll('.mobile-card[data-backend-loaded="false"]');
        existingCards.forEach(card => card.remove());

        // Add backend products
        products.forEach(product => {
            const card = createProductCard(product);
            card.setAttribute('data-backend-loaded', 'true');
            container.appendChild(card);
        });

        // Re-initialize cart buttons
        if (window.unifiedCart) {
            window.unifiedCart.setupAddToCartButtons();
        }
    }

    function createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'mobile-card';
        card.setAttribute('data-product-id', product.product_id);
        card.setAttribute('data-price', product.price);

        const imageUrl = product.image_url || product.images?.[0] || 'media/logo.png';
        const rating = product.average_rating > 0 ? 
            `<div class="mobile-rating">⭐ ${product.average_rating.toFixed(1)} (${product.total_reviews || 0})</div>` : '';

        card.innerHTML = `
            <div class="mobile-image">
                <img src="${imageUrl}" alt="${product.name}" onerror="this.src='media/logo.png'">
            </div>
            <div class="mobile-info">
                <h3 class="mobile-title">${product.name}</h3>
                <div class="mobile-specs">
                    <span>${product.processor || 'N/A'}</span>
                    <span>${product.battery_capacity || 'N/A'}</span>
                </div>
                <div class="mobile-price-section">
                    <span class="mobile-price">₹${parseFloat(product.price).toLocaleString('en-IN')}</span>
                    ${product.original_price && product.original_price > product.price ? 
                        `<span class="mobile-mrp">₹${parseFloat(product.original_price).toLocaleString('en-IN')}</span>` : ''}
                </div>
                ${rating}
                <button class="add-btn">Add to Cart</button>
            </div>
        `;

        return card;
    }

    function setupSearchIntegration() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;

        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const query = this.value.trim();

            if (query.length < 2) {
                // Clear search results
                return;
            }

            searchTimeout = setTimeout(async () => {
                try {
                    const response = await fetch(`backend/search_products.php?q=${encodeURIComponent(query)}&limit=10`);
                    const data = await response.json();

                    if (data.status === 'success' && data.products) {
                        displaySearchResults(data.products);
                    }
                } catch (error) {
                    console.error('Search error:', error);
                }
            }, 300);
        });
    }

    function displaySearchResults(products) {
        // Create or update search results dropdown
        let resultsContainer = document.getElementById('searchResults');
        
        if (!resultsContainer) {
            resultsContainer = document.createElement('div');
            resultsContainer.id = 'searchResults';
            resultsContainer.className = 'search-results-dropdown';
            document.getElementById('searchContainer').appendChild(resultsContainer);
        }

        if (products.length === 0) {
            resultsContainer.innerHTML = '<div class="search-no-results">No products found</div>';
            resultsContainer.style.display = 'block';
            return;
        }

        let html = '<div class="search-results-list">';
        products.forEach(product => {
            html += `
                <div class="search-result-item" onclick="window.location.href='?product=${product.product_slug || product.product_id}'">
                    <img src="${product.image_url || 'media/logo.png'}" alt="${product.name}">
                    <div class="search-result-info">
                        <div class="search-result-name">${product.name}</div>
                        <div class="search-result-price">₹${parseFloat(product.price).toLocaleString('en-IN')}</div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        resultsContainer.innerHTML = html;
        resultsContainer.style.display = 'block';
    }

    // Initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBackendIntegration);
    } else {
        initBackendIntegration();
    }

    // Export for global access
    window.backendIntegration = {
        checkAuthStatus,
        fetchProductsByCategory,
        renderProductsFromBackend
    };
})();

