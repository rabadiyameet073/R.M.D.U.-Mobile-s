/**
 * Global Functionality Handler
 * Makes all buttons and features work across the website
 */

(function() {
    'use strict';

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        initAllFunctionality();
    });

    function initAllFunctionality() {
        // 1. Initialize Add to Cart buttons
        initAddToCartButtons();

        // 2. Initialize Section Navigation
        initSectionNavigation();

        // 3. Initialize Search Functionality
        initSearchFunctionality();

        // 4. Initialize CTA Buttons
        initCTAButtons();

        // 5. Initialize Logo Click
        initLogoClick();

        // 6. Initialize Scroll Indicators
        initScrollIndicators();

        // 7. Initialize Wishlist Buttons (if page has products)
        if (document.querySelector('.mobile-card')) {
            if (typeof window.wishlistManager === 'undefined') {
                // Initialize wishlist if not already done
                setTimeout(() => {
                    if (typeof WishlistManager !== 'undefined') {
                        window.wishlistManager = new WishlistManager();
                    }
                }, 500);
            }
        }

        // 8. Initialize Mini Cart (if not already initialized)
        if (typeof window.miniCart === 'undefined') {
            setTimeout(() => {
                if (typeof MiniCart !== 'undefined') {
                    window.miniCart = new MiniCart();
                }
            }, 500);
        }

        // 9. Initialize Toast Notifications (if not already done)
        if (typeof window.showToast === 'undefined' && typeof ToastNotification !== 'undefined') {
            window.showToast = function(message, type) {
                ToastNotification.show(message, type);
            };
        }

        // 10. Update Cart Badge on all pages
        updateCartBadge();
    }

    // ========== ADD TO CART FUNCTIONALITY ==========
    function initAddToCartButtons() {
        // Use unified cart system if available
        if (window.unifiedCart && window.unifiedCart.setupAddToCartButtons) {
            window.unifiedCart.setupAddToCartButtons();
            return;
        }

        // Fallback: Setup buttons manually
        const addButtons = document.querySelectorAll('.add-btn');
        
        addButtons.forEach(button => {
            // Skip if already has listener
            if (button.hasAttribute('data-cart-initialized')) return;
            
            button.setAttribute('data-cart-initialized', 'true');
            
            button.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const card = this.closest('.mobile-card');
                if (!card) return;

                const productName = card.querySelector('.mobile-title')?.textContent.trim() || '';
                const priceElement = card.querySelector('.mobile-price');
                const priceText = priceElement?.textContent.trim() || '0';
                const price = parseFloat(priceText.replace(/[₹,]/g, '')) || 0;
                const image = card.querySelector('img')?.src || 'media/logo.png';
                const productId = card.getAttribute('data-product-id') || 
                                card.getAttribute('data-id') || null;

                if (!productName || price === 0) {
                    showNotification('Error: Product information missing', 'error');
                    return;
                }

                // Use unified cart if available
                if (window.unifiedCart && window.unifiedCart.addToCart) {
                    window.unifiedCart.addToCart({
                        id: productId || productName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                        name: productName,
                        price: price,
                        image: image,
                        quantity: 1
                    });
                    return;
                }

                // Fallback: Direct add
                const originalText = this.textContent;
                this.disabled = true;
                this.textContent = 'Adding...';

                try {
                    if (productId) {
                        const formData = new FormData();
                        formData.append('product_id', productId);
                        formData.append('quantity', 1);

                        const response = await fetch('backend/cart/add_to_cart.php', {
                            method: 'POST',
                            body: formData
                        });

                        const data = await response.json();
                        if (data.success) {
                            this.textContent = '✓ Added';
                            this.style.background = '#10b981';
                            updateCartBadge();
                            if (window.miniCart) {
                                window.miniCart.loadCartCount();
                                window.miniCart.loadCartItems();
                            }
                            showNotification(productName + ' added to cart!', 'success');
                            setTimeout(() => {
                                this.textContent = originalText;
                                this.style.background = '';
                                this.disabled = false;
                            }, 2000);
                            return;
                        }
                    }

                    // localStorage fallback
                    addToLocalCart({
                        id: productName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                        name: productName,
                        price: price,
                        image: image,
                        quantity: 1
                    });

                    this.textContent = '✓ Added';
                    this.style.background = '#10b981';
                    updateCartBadge();
                    showNotification(productName + ' added to cart!', 'success');
                    
                    setTimeout(() => {
                        this.textContent = originalText;
                        this.style.background = '';
                        this.disabled = false;
                    }, 2000);

                } catch (error) {
                    console.error('Error:', error);
                    this.textContent = originalText;
                    this.disabled = false;
                    showNotification('Error adding to cart', 'error');
                }
            });
        });
    }

    function addToLocalCart(product) {
        const cartKey = 'shopping_cart';
        let cart = [];
        
        try {
            const stored = localStorage.getItem(cartKey);
            cart = stored ? JSON.parse(stored) : [];
        } catch (e) {
            cart = [];
        }

        const existingIndex = cart.findIndex(item => item.id === product.id || item.name === product.name);
        
        if (existingIndex >= 0) {
            cart[existingIndex].quantity += 1;
        } else {
            cart.push(product);
        }

        localStorage.setItem(cartKey, JSON.stringify(cart));
        window.dispatchEvent(new Event('cartUpdated'));
    }

    function updateCartBadge() {
        // Update all cart badges
        const badges = document.querySelectorAll('.cart-badge, #cartBadge');
        
        Promise.all([
            fetch('backend/cart/get_cart.php').then(r => r.json()).catch(() => ({ success: false })),
            Promise.resolve(() => {
                try {
                    const localCart = JSON.parse(localStorage.getItem('shopping_cart') || '[]');
                    return localCart.reduce((sum, item) => sum + (item.quantity || 0), 0);
                } catch {
                    return 0;
                }
            })()
        ]).then(([backendData, localCount]) => {
            let totalCount = localCount;
            
            if (backendData.success && backendData.data && backendData.data.items) {
                totalCount = backendData.data.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
            }
            
            badges.forEach(badge => {
                badge.textContent = totalCount;
                badge.style.display = totalCount > 0 ? 'block' : 'none';
            });
        });
    }

    // ========== SECTION NAVIGATION ==========
    function initSectionNavigation() {
        const indicators = document.querySelectorAll('.section-indicator');
        const sections = document.querySelectorAll('.full-screen-section');

        indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', function() {
                if (sections[index]) {
                    sections[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
                    
                    // Update active state
                    indicators.forEach(ind => ind.classList.remove('active'));
                    this.classList.add('active');
                }
            });
        });

        // Update indicators on scroll
        const scrollContainer = document.querySelector('.scroll-container');
        if (scrollContainer) {
            let ticking = false;
            scrollContainer.addEventListener('scroll', function() {
                if (!ticking) {
                    window.requestAnimationFrame(() => {
                        updateActiveIndicator();
                        ticking = false;
                    });
                    ticking = true;
                }
            });
        }
    }

    function updateActiveIndicator() {
        const sections = document.querySelectorAll('.full-screen-section');
        const indicators = document.querySelectorAll('.section-indicator');
        
        const scrollContainer = document.querySelector('.scroll-container');
        if (!scrollContainer) return;

        const scrollTop = scrollContainer.scrollTop;
        const containerHeight = scrollContainer.clientHeight;

        sections.forEach((section, index) => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            
            if (scrollTop >= sectionTop - containerHeight / 2 && 
                scrollTop < sectionTop + sectionHeight - containerHeight / 2) {
                
                indicators.forEach(ind => ind.classList.remove('active'));
                if (indicators[index]) {
                    indicators[index].classList.add('active');
                }
            }
        });
    }

    // ========== SEARCH FUNCTIONALITY ==========
    function initSearchFunctionality() {
        const searchInput = document.getElementById('searchInput');
        const searchButton = document.getElementById('searchButton');

        if (searchInput) {
            // Search on Enter key
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    performSearch(this.value.trim());
                }
            });
        }

        if (searchButton) {
            searchButton.addEventListener('click', function(e) {
                e.preventDefault();
                const input = document.getElementById('searchInput');
                if (input) {
                    performSearch(input.value.trim());
                }
            });
        }
    }

    function performSearch(query) {
        if (!query) return;

        // Try to search on current page first
        const productCards = document.querySelectorAll('.mobile-card');
        let found = false;

        productCards.forEach(card => {
            const title = card.querySelector('.mobile-title')?.textContent.toLowerCase() || '';
            const isVisible = title.includes(query.toLowerCase());
            card.style.display = isVisible ? 'block' : 'none';
            if (isVisible) found = true;
        });

        if (found && productCards.length > 0) {
            showNotification(`Found products matching "${query}"`, 'info');
        } else {
            // Redirect to search results or category page
            window.location.href = `/BudgetKiller.html?search=${encodeURIComponent(query)}`;
        }
    }

    // ========== CTA BUTTONS ==========
    function initCTAButtons() {
        const ctaButtons = document.querySelectorAll('.cta-btn');
        
        ctaButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                // Let default link behavior work, just add animation
                this.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 150);
            });
        });
    }

    // ========== LOGO CLICK ==========
    function initLogoClick() {
        const logos = document.querySelectorAll('.logo, .nav-center img');
        
        logos.forEach(logo => {
            logo.style.cursor = 'pointer';
            logo.addEventListener('click', function() {
                window.location.href = 'index.html';
            });
        });
    }

    // ========== SCROLL INDICATORS ==========
    function initScrollIndicators() {
        const scrollIndicator = document.querySelector('.scroll-indicator');
        
        if (scrollIndicator) {
            scrollIndicator.style.cursor = 'pointer';
            scrollIndicator.addEventListener('click', function() {
                const scrollContainer = document.querySelector('.scroll-container');
                if (scrollContainer) {
                    scrollContainer.scrollBy({
                        top: window.innerHeight,
                        behavior: 'smooth'
                    });
                }
            });
        }
    }

    // ========== NOTIFICATION SYSTEM ==========
    function showNotification(message, type = 'info') {
        // Use toast notification if available
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
            return;
        }

        // Fallback notification
        const notification = document.createElement('div');
        notification.className = `global-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            z-index: 10000;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            font-weight: 600;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Listen for cart updates
    window.addEventListener('cartUpdated', function() {
        updateCartBadge();
        if (window.miniCart) {
            window.miniCart.loadCartCount();
        }
    });

    // Export functions for global access
    window.globalFunctionality = {
        addToCart: addToLocalCart,
        updateCartBadge: updateCartBadge,
        showNotification: showNotification
    };
})();

