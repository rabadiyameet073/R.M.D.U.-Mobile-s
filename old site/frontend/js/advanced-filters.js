/**
 * ============================================
 * RMDU Mobiles - Advanced Filtering & Sorting System
 * Enhanced UX for product discovery
 * ============================================
 */

class AdvancedFilters {
    constructor() {
        this.filters = {
            priceRange: null,
            brand: [],
            ram: [],
            storage: [],
            batteryMin: null,
            batteryMax: null,
            cameraMin: null,
            connectivity: [],
            vfmRating: null,
            search: ''
        };
        this.sortBy = 'price-low'; // Default: price low to high
        this.allProducts = [];
        this.filteredProducts = [];

        this.init();
    }

    init() {
        this.loadProducts();
        this.setupEventListeners();
        this.loadStateFromURL();
    }

    // Load all products from the page
    loadProducts() {
        const cards = document.querySelectorAll('.mobile-card');
        this.allProducts = Array.from(cards).map(card => ({
            element: card,
            price: this.extractPrice(card),
            title: card.querySelector('.mobile-title')?.textContent.trim() || '',
            brand: this.extractBrand(card),
            image: card.querySelector('img')?.src || '',
            dataPrice: parseFloat(card.getAttribute('data-price')) || this.extractPrice(card),
            // Extract additional attributes if available
            ram: this.extractSpec(card, 'RAM') || '',
            storage: this.extractSpec(card, 'Storage') || '',
            battery: this.extractSpec(card, 'Battery') || '',
            camera: this.extractSpec(card, 'Camera') || ''
        }));

        this.filteredProducts = [...this.allProducts];
        this.applyFilters();
    }

    // Extract numeric price from card
    extractPrice(card) {
        const priceElement = card.querySelector('.mobile-price');
        if (!priceElement) return 0;
        const priceText = priceElement.textContent.trim();
        return parseInt(priceText.replace(/[₹,]/g, '')) || 0;
    }

    // Extract brand from title
    extractBrand(card) {
        const title = card.querySelector('.mobile-title')?.textContent.trim() || '';
        const brands = ['Samsung', 'Apple', 'OnePlus', 'Redmi', 'POCO', 'Realme', 'iQOO',
            'Vivo', 'OPPO', 'Moto', 'Motorola', 'Infinix', 'Tecno', 'Lava', 'Nothing'];
        for (const brand of brands) {
            if (title.toLowerCase().includes(brand.toLowerCase())) {
                return brand;
            }
        }
        return 'Other';
    }

    // Extract spec value if available in data attributes
    extractSpec(card, specType) {
        const specValue = card.getAttribute(`data-${specType.toLowerCase()}`);
        return specValue || null;
    }

    // Setup event listeners for filter controls
    setupEventListeners() {
        // Price range filter
        const priceFilters = document.querySelectorAll('.filter-price-option');
        priceFilters.forEach(option => {
            option.addEventListener('click', (e) => {
                priceFilters.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                const value = option.getAttribute('data-price-range');
                this.filters.priceRange = value === 'all' ? null : value;
                this.applyFilters();
                this.updateURL();
            });
        });

        // Brand filters
        const brandFilters = document.querySelectorAll('.filter-brand-option');
        brandFilters.forEach(option => {
            option.addEventListener('change', (e) => {
                const brand = option.value;
                if (option.checked) {
                    if (!this.filters.brand.includes(brand)) {
                        this.filters.brand.push(brand);
                    }
                } else {
                    this.filters.brand = this.filters.brand.filter(b => b !== brand);
                }
                this.applyFilters();
                this.updateURL();
            });
        });

        // RAM filters
        const ramFilters = document.querySelectorAll('.filter-ram-option');
        ramFilters.forEach(option => {
            option.addEventListener('change', (e) => {
                const ram = option.value;
                if (option.checked) {
                    if (!this.filters.ram.includes(ram)) {
                        this.filters.ram.push(ram);
                    }
                } else {
                    this.filters.ram = this.filters.ram.filter(r => r !== ram);
                }
                this.applyFilters();
                this.updateURL();
            });
        });

        // Storage filters
        const storageFilters = document.querySelectorAll('.filter-storage-option');
        storageFilters.forEach(option => {
            option.addEventListener('change', (e) => {
                const storage = option.value;
                if (option.checked) {
                    if (!this.filters.storage.includes(storage)) {
                        this.filters.storage.push(storage);
                    }
                } else {
                    this.filters.storage = this.filters.storage.filter(s => s !== storage);
                }
                this.applyFilters();
                this.updateURL();
            });
        });

        // Connectivity filters
        const connectivityFilters = document.querySelectorAll('.filter-connectivity-option');
        connectivityFilters.forEach(option => {
            option.addEventListener('change', (e) => {
                const connectivity = option.value;
                if (option.checked) {
                    if (!this.filters.connectivity.includes(connectivity)) {
                        this.filters.connectivity.push(connectivity);
                    }
                } else {
                    this.filters.connectivity = this.filters.connectivity.filter(c => c !== connectivity);
                }
                this.applyFilters();
                this.updateURL();
            });
        });

        // Search input
        const searchInput = document.getElementById('advancedSearchInput');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.filters.search = e.target.value.toLowerCase().trim();
                    this.applyFilters();
                    this.updateURL();
                }, 300); // Debounce 300ms
            });
        }

        // Sort dropdown
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.applyFilters();
                this.updateURL();
            });
        }

        // Clear filters button
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }

        // Filter toggle (mobile)
        const filterToggle = document.getElementById('filterToggle');
        const filterPanel = document.getElementById('filterPanel');
        const filterPanelClose = document.getElementById('filterPanelClose');

        if (filterToggle && filterPanel) {
            filterToggle.addEventListener('click', () => {
                filterPanel.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        }

        if (filterPanelClose && filterPanel) {
            filterPanelClose.addEventListener('click', () => {
                filterPanel.classList.remove('active');
                document.body.style.overflow = '';
            });
        }

        // Close panel when clicking outside (mobile)
        if (filterPanel) {
            filterPanel.addEventListener('click', (e) => {
                if (e.target === filterPanel) {
                    filterPanel.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        }
    }

    // Apply all filters and sorting
    applyFilters() {
        let filtered = [...this.allProducts];

        // Price range filter
        if (this.filters.priceRange) {
            filtered = filtered.filter(product => {
                const price = product.price;
                switch (this.filters.priceRange) {
                    case 'under-10k':
                        return price < 10000;
                    case '10k-20k':
                        return price >= 10000 && price < 20000;
                    case '20k-30k':
                        return price >= 20000 && price < 30000;
                    case '30k-40k':
                        return price >= 30000 && price < 40000;
                    case '40k-50k':
                        return price >= 40000 && price < 50000;
                    case '50k-plus':
                        return price >= 50000;
                    default:
                        return true;
                }
            });
        }

        // Brand filter
        if (this.filters.brand.length > 0) {
            filtered = filtered.filter(product => {
                return this.filters.brand.some(brand =>
                    product.brand.toLowerCase() === brand.toLowerCase() ||
                    product.title.toLowerCase().includes(brand.toLowerCase())
                );
            });
        }

        // RAM filter
        if (this.filters.ram.length > 0) {
            filtered = filtered.filter(product => {
                if (!product.ram) return false;
                return this.filters.ram.some(ram =>
                    product.ram.includes(ram)
                );
            });
        }

        // Storage filter
        if (this.filters.storage.length > 0) {
            filtered = filtered.filter(product => {
                if (!product.storage) return false;
                return this.filters.storage.some(storage =>
                    product.storage.includes(storage)
                );
            });
        }

        // Connectivity filter
        if (this.filters.connectivity.length > 0) {
            filtered = filtered.filter(product => {
                if (!product.title) return false;
                return this.filters.connectivity.some(conn =>
                    product.title.toLowerCase().includes(conn.toLowerCase())
                );
            });
        }

        // Search filter
        if (this.filters.search) {
            filtered = filtered.filter(product => {
                return product.title.toLowerCase().includes(this.filters.search);
            });
        }

        // Sort products
        filtered = this.sortProducts(filtered);

        // Update filter chips
        this.displayFilterChips();

        // Update UI
        this.updateProductDisplay(filtered);
        this.updateResultsCount(filtered.length);
    }

    // Display active filter chips
    displayFilterChips() {
        let chipsContainer = document.getElementById('filterChipsContainer');

        if (!chipsContainer) {
            // Create chips container if it doesn't exist
            const filterPanel = document.getElementById('filterPanelContainer');
            if (filterPanel) {
                const chipsHTML = `<div id="filterChipsContainer" class="filter-chips-container"></div>`;
                filterPanel.insertAdjacentHTML('afterend', chipsHTML);
                chipsContainer = document.getElementById('filterChipsContainer');
            }
        }

        if (!chipsContainer) return;

        const chips = [];

        // Price range chip
        if (this.filters.priceRange) {
            const labels = {
                'under-10k': 'Under ₹10K',
                '10k-20k': '₹10K - ₹20K',
                '20k-30k': '₹20K - ₹30K',
                '30k-40k': '₹30K - ₹40K',
                '40k-50k': '₹40K - ₹50K',
                '50k-plus': '₹50K+'
            };
            chips.push({
                type: 'price',
                label: labels[this.filters.priceRange] || this.filters.priceRange,
                value: this.filters.priceRange
            });
        }

        // Brand chips
        this.filters.brand.forEach(brand => {
            chips.push({ type: 'brand', label: brand, value: brand });
        });

        // RAM chips
        this.filters.ram.forEach(ram => {
            chips.push({ type: 'ram', label: ram + ' RAM', value: ram });
        });

        // Storage chips
        this.filters.storage.forEach(storage => {
            chips.push({ type: 'storage', label: storage + ' Storage', value: storage });
        });

        // Connectivity chips
        this.filters.connectivity.forEach(conn => {
            chips.push({ type: 'connectivity', label: conn, value: conn });
        });

        // Search chip
        if (this.filters.search) {
            chips.push({ type: 'search', label: `"${this.filters.search}"`, value: this.filters.search });
        }

        if (chips.length === 0) {
            chipsContainer.style.display = 'none';
            return;
        }

        chipsContainer.style.display = 'flex';
        chipsContainer.innerHTML = `
            <div class="filter-chips">
                ${chips.map(chip => `
                    <div class="filter-chip" data-type="${chip.type}" data-value="${chip.value}">
                        <span>${chip.label}</span>
                        <button class="chip-remove" aria-label="Remove filter" data-type="${chip.type}" data-value="${chip.value}">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                                <path d="M4.05 4.05a.5.5 0 0 1 .707 0L7 6.293l2.243-2.243a.5.5 0 1 1 .707.707L7.707 7l2.243 2.243a.5.5 0 0 1-.707.707L7 7.707 4.757 9.95a.5.5 0 0 1-.707-.707L6.293 7 4.05 4.757a.5.5 0 0 1 0-.707z"/>
                            </svg>
                        </button>
                    </div>
                `).join('')}
                ${chips.length > 1 ? `
                    <button class="clear-all-chips" id="clearAllChips">
                        Clear All
                    </button>
                ` : ''}
            </div>
        `;

        // Add event listeners for chip removal
        chipsContainer.querySelectorAll('.chip-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.getAttribute('data-type');
                const value = e.currentTarget.getAttribute('data-value');
                this.removeFilter(type, value);
            });
        });

        const clearAllBtn = document.getElementById('clearAllChips');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }
    }

    // Remove individual filter
    removeFilter(type, value) {
        switch (type) {
            case 'price':
                this.filters.priceRange = null;
                const priceOptions = document.querySelectorAll('.filter-price-option');
                priceOptions.forEach(opt => {
                    if (opt.getAttribute('data-price-range') === 'all') {
                        opt.classList.add('active');
                    } else {
                        opt.classList.remove('active');
                    }
                });
                break;
            case 'brand':
                this.filters.brand = this.filters.brand.filter(b => b !== value);
                const brandCheckbox = document.querySelector(`.filter-brand-option[value="${value}"]`);
                if (brandCheckbox) brandCheckbox.checked = false;
                break;
            case 'ram':
                this.filters.ram = this.filters.ram.filter(r => r !== value);
                const ramCheckbox = document.querySelector(`.filter-ram-option[value="${value}"]`);
                if (ramCheckbox) ramCheckbox.checked = false;
                break;
            case 'storage':
                this.filters.storage = this.filters.storage.filter(s => s !== value);
                const storageCheckbox = document.querySelector(`.filter-storage-option[value="${value}"]`);
                if (storageCheckbox) storageCheckbox.checked = false;
                break;
            case 'connectivity':
                this.filters.connectivity = this.filters.connectivity.filter(c => c !== value);
                const connCheckbox = document.querySelector(`.filter-connectivity-option[value="${value}"]`);
                if (connCheckbox) connCheckbox.checked = false;
                break;
            case 'search':
                this.filters.search = '';
                const searchInput = document.getElementById('advancedSearchInput');
                if (searchInput) searchInput.value = '';
                break;
        }

        this.applyFilters();
        this.updateURL();
    }


    // Sort products based on selected option
    sortProducts(products) {
        const sorted = [...products];

        switch (this.sortBy) {
            case 'price-low':
                sorted.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                sorted.sort((a, b) => b.price - a.price);
                break;
            case 'name-asc':
                sorted.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'name-desc':
                sorted.sort((a, b) => b.title.localeCompare(a.title));
                break;
            case 'newest':
                // If we had a date field, sort by it
                // For now, just reverse the array
                sorted.reverse();
                break;
            default:
                sorted.sort((a, b) => a.price - b.price);
        }

        return sorted;
    }

    // Update product display
    updateProductDisplay(products) {
        const main = document.querySelector('main');
        const sections = main.querySelectorAll('section');

        // Hide all products first
        this.allProducts.forEach(product => {
            product.element.style.display = 'none';
        });

        // Show filtered products
        products.forEach(product => {
            product.element.style.display = 'block';
        });

        // Reorganize into appropriate sections or create a single results section
        this.organizeProducts(products);
    }

    // Organize products into sections
    organizeProducts(products) {
        const main = document.querySelector('main');

        // Find or create results container
        let resultsSection = document.getElementById('filteredResults');

        if (!resultsSection) {
            // Hide existing sections
            const existingSections = main.querySelectorAll('section');
            existingSections.forEach(section => {
                section.style.display = 'none';
            });

            // Create results section
            resultsSection = document.createElement('section');
            resultsSection.id = 'filteredResults';
            resultsSection.className = 'phone-grid-filtered';
            main.appendChild(resultsSection);
        } else {
            resultsSection.innerHTML = '';
        }

        // Add filtered products
        products.forEach(product => {
            resultsSection.appendChild(product.element);
        });

        // Show results section
        resultsSection.style.display = 'grid';
    }

    // Update results count
    updateResultsCount(count) {
        const countElement = document.getElementById('resultsCount');
        if (countElement) {
            countElement.textContent = `${count} product${count !== 1 ? 's' : ''} found`;
        }
    }

    // Clear all filters
    clearAllFilters() {
        this.filters = {
            priceRange: null,
            brand: [],
            ram: [],
            storage: [],
            batteryMin: null,
            batteryMax: null,
            cameraMin: null,
            connectivity: [],
            vfmRating: null,
            search: ''
        };
        this.sortBy = 'price-low';

        // Reset UI
        document.querySelectorAll('.filter-price-option').forEach(opt => {
            if (opt.getAttribute('data-price-range') === 'all') {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });

        document.querySelectorAll('.filter-brand-option, .filter-ram-option, .filter-storage-option, .filter-connectivity-option').forEach(opt => {
            opt.checked = false;
        });

        const searchInput = document.getElementById('advancedSearchInput');
        if (searchInput) searchInput.value = '';

        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) sortSelect.value = 'price-low';

        this.applyFilters();
        this.updateURL();
    }

    // Update URL with filter state
    updateURL() {
        const params = new URLSearchParams();

        if (this.filters.priceRange) params.set('price', this.filters.priceRange);
        if (this.filters.brand.length > 0) params.set('brand', this.filters.brand.join(','));
        if (this.filters.ram.length > 0) params.set('ram', this.filters.ram.join(','));
        if (this.filters.storage.length > 0) params.set('storage', this.filters.storage.join(','));
        if (this.filters.connectivity.length > 0) params.set('connectivity', this.filters.connectivity.join(','));
        if (this.filters.search) params.set('search', this.filters.search);
        if (this.sortBy !== 'price-low') params.set('sort', this.sortBy);

        const newURL = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
        window.history.replaceState({}, '', newURL);
    }

    // Load state from URL
    loadStateFromURL() {
        const params = new URLSearchParams(window.location.search);

        if (params.has('price')) {
            this.filters.priceRange = params.get('price');
            const priceOption = document.querySelector(`[data-price-range="${this.filters.priceRange}"]`);
            if (priceOption) {
                document.querySelectorAll('.filter-price-option').forEach(opt => opt.classList.remove('active'));
                priceOption.classList.add('active');
            }
        }

        if (params.has('brand')) {
            this.filters.brand = params.get('brand').split(',');
            this.filters.brand.forEach(brand => {
                const checkbox = document.querySelector(`.filter-brand-option[value="${brand}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }

        if (params.has('ram')) {
            this.filters.ram = params.get('ram').split(',');
            this.filters.ram.forEach(ram => {
                const checkbox = document.querySelector(`.filter-ram-option[value="${ram}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }

        if (params.has('storage')) {
            this.filters.storage = params.get('storage').split(',');
            this.filters.storage.forEach(storage => {
                const checkbox = document.querySelector(`.filter-storage-option[value="${storage}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }

        if (params.has('connectivity')) {
            this.filters.connectivity = params.get('connectivity').split(',');
            this.filters.connectivity.forEach(conn => {
                const checkbox = document.querySelector(`.filter-connectivity-option[value="${conn}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }

        if (params.has('search')) {
            this.filters.search = params.get('search');
            const searchInput = document.getElementById('advancedSearchInput');
            if (searchInput) searchInput.value = this.filters.search;
        }

        if (params.has('sort')) {
            this.sortBy = params.get('sort');
            const sortSelect = document.getElementById('sortSelect');
            if (sortSelect) sortSelect.value = this.sortBy;
        }

        if (params.toString()) {
            this.applyFilters();
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    if (document.querySelector('.mobile-card')) {
        window.advancedFilters = new AdvancedFilters();
    }
});

