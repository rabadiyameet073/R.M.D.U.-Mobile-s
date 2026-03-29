/**
 * ============================================
 * Backend Filter Integration
 * Integrates frontend filters with backend API
 * ============================================
 */

class BackendFilterIntegration {
    constructor() {
        this.filters = {
            category: null,
            brand: null,
            min_price: null,
            max_price: null,
            min_rating: null,
            ram: null,
            storage: null,
            battery_min: null,
            display_type: null,
            search: null
        };
        this.sort = 'price_asc';
        this.page = 1;
        this.limit = 20;
        this.products = [];
        this.loading = false;
    }

    async fetchProducts() {
        if (this.loading) return;

        this.loading = true;
        const params = new URLSearchParams();

        // Add filters
        Object.keys(this.filters).forEach(key => {
            if (this.filters[key] !== null && this.filters[key] !== '') {
                params.append(key, this.filters[key]);
            }
        });

        // Add sorting and pagination
        params.append('sort', this.sort);
        params.append('page', this.page);
        params.append('limit', this.limit);

        try {
            const response = await fetch(`backend/filter_products.php?${params}`);
            const data = await response.json();

            if (data.status === 'success') {
                this.products = data.products || [];
                this.renderProducts();
                this.updateResultsCount(data.pagination?.total || 0);
                return data;
            }
        } catch (error) {
            console.error('Filter fetch error:', error);
            // Fallback to client-side filtering if backend fails
            this.fallbackClientSideFilter();
        } finally {
            this.loading = false;
        }
    }

    setFilter(key, value) {
        this.filters[key] = value;
        this.page = 1; // Reset to first page
        this.fetchProducts();
        this.updateURL();
    }

    setSort(sortValue) {
        this.sort = sortValue;
        this.fetchProducts();
        this.updateURL();
    }

    clearFilters() {
        this.filters = {
            category: null,
            brand: null,
            min_price: null,
            max_price: null,
            min_rating: null,
            ram: null,
            storage: null,
            battery_min: null,
            display_type: null,
            search: null
        };
        this.sort = 'price_asc';
        this.page = 1;
        this.fetchProducts();
        this.updateURL();
    }

    renderProducts() {
        const container = document.getElementById('productGrid') || 
                         document.querySelector('.phone-grid') ||
                         document.querySelector('main');

        if (!container) return;

        // Clear existing products
        const existingCards = container.querySelectorAll('.mobile-card');
        existingCards.forEach(card => card.remove());

        // Create product cards
        this.products.forEach(product => {
            const card = this.createProductCard(product);
            container.appendChild(card);
        });

        // Re-initialize add to cart buttons
        if (window.unifiedCart) {
            window.unifiedCart.setupAddToCartButtons();
        }
    }

    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'mobile-card';
        card.setAttribute('data-product-id', product.product_id);
        card.setAttribute('data-price', product.price);

        card.innerHTML = `
            <div class="mobile-image">
                <img src="${product.image_url || 'media/logo.png'}" 
                     alt="${product.name}" 
                     onerror="this.src='media/logo.png'">
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
                ${product.average_rating > 0 ? 
                    `<div class="mobile-rating">⭐ ${product.average_rating.toFixed(1)} (${product.total_reviews || 0})</div>` : ''}
                <button class="add-btn">Add to Cart</button>
            </div>
        `;

        return card;
    }

    updateResultsCount(total) {
        const countElement = document.getElementById('resultsCount');
        if (countElement) {
            countElement.textContent = `${total} product${total !== 1 ? 's' : ''} found`;
        }
    }

    updateURL() {
        const params = new URLSearchParams();
        Object.keys(this.filters).forEach(key => {
            if (this.filters[key] !== null && this.filters[key] !== '') {
                params.append(key, this.filters[key]);
            }
        });
        if (this.sort !== 'price_asc') {
            params.append('sort', this.sort);
        }
        window.history.replaceState({}, '', window.location.pathname + (params.toString() ? '?' + params.toString() : ''));
    }

    loadFromURL() {
        const params = new URLSearchParams(window.location.search);
        Object.keys(this.filters).forEach(key => {
            if (params.has(key)) {
                this.filters[key] = params.get(key);
            }
        });
        if (params.has('sort')) {
            this.sort = params.get('sort');
        }
        if (params.has('page')) {
            this.page = parseInt(params.get('page'));
        }
    }

    fallbackClientSideFilter() {
        // Fallback to existing client-side filter if backend fails
        if (window.advancedFilters) {
            window.advancedFilters.applyFilters();
        }
    }
}

// Initialize and integrate with existing filter system
document.addEventListener('DOMContentLoaded', function() {
    window.backendFilter = new BackendFilterIntegration();
    
    // Load filters from URL
    window.backendFilter.loadFromURL();
    
    // If on a product listing page, fetch products
    if (document.querySelector('.phone-grid') || document.getElementById('productGrid')) {
        window.backendFilter.fetchProducts();
    }

    // Integrate with existing filter UI
    const filterControls = {
        priceRange: document.querySelectorAll('.filter-price-option'),
        brand: document.querySelectorAll('.filter-brand-option'),
        sort: document.getElementById('sortSelect')
    };

    // Price range
    filterControls.priceRange?.forEach(option => {
        option.addEventListener('click', function() {
            const range = this.getAttribute('data-price-range');
            if (range === 'all') {
                window.backendFilter.setFilter('min_price', null);
                window.backendFilter.setFilter('max_price', null);
            } else {
                const [min, max] = range.split('-').map(v => v.replace('k', '000').replace('plus', '999999'));
                window.backendFilter.setFilter('min_price', min);
                window.backendFilter.setFilter('max_price', max || null);
            }
        });
    });

    // Brand filter
    filterControls.brand?.forEach(option => {
        option.addEventListener('change', function() {
            if (this.checked) {
                window.backendFilter.setFilter('brand', this.value);
            } else {
                window.backendFilter.setFilter('brand', null);
            }
        });
    });

    // Sort
    filterControls.sort?.addEventListener('change', function() {
        const sortMap = {
            'price-low': 'price_asc',
            'price-high': 'price_desc',
            'rating': 'rating_desc',
            'name-asc': 'name_asc',
            'newest': 'newest'
        };
        window.backendFilter.setSort(sortMap[this.value] || 'price_asc');
    });
});

