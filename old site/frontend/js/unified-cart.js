/**
 * Unified Cart System
 * Single cart system that works across all pages
 * Supports both backend (database) and localStorage
 */

(function () {
    'use strict';

    const CART_KEY = 'rmdu_shopping_cart'; // Unified cart key
    let cartData = {
        items: [],
        total: 0,
        subtotal: 0,
        gst: 0,
        discount: 0
    };

    // Initialize cart system
    function initUnifiedCart() {
        loadCart();
        // Setup buttons after a short delay to ensure DOM is ready
        setTimeout(() => {
            setupAddToCartButtons();
            updateCartDisplay();
        }, 200);
    }

    // Load cart from localStorage
    async function loadCart() {
        // Use localStorage directly (no backend)
        cartData = getLocalCart();
        updateCartDisplay();
    }

    // Get cart from localStorage
    function getLocalCart() {
        try {
            const stored = localStorage.getItem(CART_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Calculate totals
                const subtotal = parsed.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                const gst = subtotal * 0.18;
                const total = subtotal + gst;

                return {
                    items: parsed.items || [],
                    subtotal: subtotal,
                    gst: gst,
                    discount: 0,
                    total: total
                };
            }
        } catch (e) {
            console.error('Error reading local cart:', e);
        }
        return { items: [], subtotal: 0, gst: 0, discount: 0, total: 0 };
    }

    // Save cart to localStorage
    function saveLocalCart() {
        try {
            localStorage.setItem(CART_KEY, JSON.stringify({
                items: cartData.items,
                subtotal: cartData.subtotal,
                gst: cartData.gst,
                discount: cartData.discount,
                total: cartData.total
            }));
            window.dispatchEvent(new Event('cartUpdated'));
        } catch (e) {
            console.error('Error saving cart:', e);
        }
    }

    // Setup Add to Cart buttons on all product cards
    function setupAddToCartButtons() {
        // Remove old listeners
        document.querySelectorAll('.add-btn').forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
        });

        // Add new listeners
        document.querySelectorAll('.add-btn').forEach(button => {
            button.addEventListener('click', async function (e) {
                e.preventDefault();
                e.stopPropagation();

                const card = this.closest('.mobile-card');
                if (!card) return;

                // Extract product information
                const productName = card.querySelector('.mobile-title')?.textContent.trim() || '';
                const priceElement = card.querySelector('.mobile-price');
                const mrpElement = card.querySelector('.mobile-mrp');

                // Parse price - remove rupee symbol and commas
                const priceText = priceElement?.textContent.trim() || '0';
                const price = parseFloat(priceText.replace(/[₹,]/g, '')) || 0;

                // Parse MRP
                const mrpText = mrpElement?.textContent.trim() || priceText;
                const mrp = parseFloat(mrpText.replace(/[₹,]/g, '')) || price;

                // Get image
                const image = card.querySelector('img')?.src || 'media/logo.png';

                // Get product ID from data attributes
                const productId = card.getAttribute('data-product-id') ||
                    card.getAttribute('data-id') ||
                    card.getAttribute('data-price') ||
                    productName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

                if (!productName || price === 0) {
                    showNotification('Error: Product information missing', 'error');
                    return;
                }

                // Disable button temporarily
                const originalText = this.textContent;
                this.disabled = true;
                this.textContent = 'Adding...';
                this.style.opacity = '0.7';

                try {
                    // Try backend first if available
                    if (window.backendCart && productId && !isNaN(productId)) {
                        const result = await window.backendCart.addToCart(parseInt(productId), 1);
                        if (result.success) {
                            this.textContent = '✓ Added';
                            this.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                            this.style.opacity = '1';
                            showNotification(`✅ ${productName} added to cart!`, 'success');
                            setTimeout(() => {
                                this.textContent = originalText;
                                this.style.background = '';
                                this.disabled = false;
                            }, 2000);
                            return;
                        }
                    }

                    // Fallback to localStorage
                    addToLocalCart({
                        id: productId,
                        name: productName,
                        price: price,
                        mrp: mrp,
                        image: image,
                        quantity: 1
                    });

                    this.textContent = '✓ Added';
                    this.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                    this.style.opacity = '1';

                    showNotification(`✅ ${productName} (₹${price.toLocaleString('en-IN')}) added to cart successfully!`, 'success');

                    setTimeout(() => {
                        this.textContent = originalText;
                        this.style.background = '';
                        this.disabled = false;
                    }, 2000);

                } catch (error) {
                    console.error('Error adding to cart:', error);
                    this.textContent = originalText;
                    this.style.opacity = '1';
                    this.disabled = false;
                    showNotification('Error adding to cart', 'error');
                }
            });
        });
    }

    // Add item to localStorage cart
    function addToLocalCart(product) {
        const existingIndex = cartData.items.findIndex(item =>
            item.id === product.id || item.name === product.name
        );

        if (existingIndex >= 0) {
            cartData.items[existingIndex].quantity += 1;
        } else {
            cartData.items.push(product);
        }

        // Recalculate totals
        cartData.subtotal = cartData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cartData.gst = cartData.subtotal * 0.18;
        cartData.discount = cartData.items.reduce((sum, item) => {
            const itemDiscount = (item.mrp || item.price) - item.price;
            return sum + (itemDiscount * item.quantity);
        }, 0);
        cartData.total = cartData.subtotal + cartData.gst;

        saveLocalCart();
        updateCartDisplay();
    }

    // Update cart display (badge, mini cart, etc.)
    function updateCartDisplay() {
        const totalItems = cartData.items.reduce((sum, item) => sum + (item.quantity || 0), 0);

        // Update cart badge
        document.querySelectorAll('.cart-badge, #cartBadge').forEach(badge => {
            badge.textContent = totalItems;
            badge.style.display = totalItems > 0 ? 'block' : 'none';
        });

        // Update mini cart if exists
        if (window.miniCart) {
            setTimeout(() => {
                if (window.miniCart.loadCartCount) window.miniCart.loadCartCount();
                if (window.miniCart.loadCartItems) window.miniCart.loadCartItems();
            }, 100);
        }

        // Update cart page if on cart page
        if (document.getElementById('cartContainer')) {
            displayCartPage();
        }
    }

    // Add to cart function
    async function addToCart(product) {
        // Try backend first
        if (product.id && !isNaN(product.id)) {
            const formData = new FormData();
            formData.append('product_id', product.id);
            formData.append('quantity', product.quantity || 1);

            try {
                const response = await fetch('backend/cart/add_to_cart.php', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                if (data.success) {
                    await loadCart();
                    return;
                }
            } catch (error) {
                console.log('Backend add failed, using localStorage');
            }
        }

        // Use localStorage
        addToLocalCart(product);
    }

    // Display cart on cart page
    function displayCartPage() {
        const container = document.getElementById('cartContainer');
        if (!container) return;

        if (!cartData.items || cartData.items.length === 0) {
            container.innerHTML = `
                <div class="empty-cart">
                    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="38" cy="98" r="8"/>
                        <circle cx="82" cy="98" r="8"/>
                        <path d="M10 20h16l12 48h44l12-36H30"/>
                    </svg>
                    <h2>Your cart is empty</h2>
                    <p>Start shopping and add items to your cart!</p>
                    <a href="index.html" class="continue-shopping">Continue Shopping</a>
                </div>
            `;
            return;
        }

        let itemsHTML = '<div class="cart-items">';
        cartData.items.forEach((item, index) => {
            const itemTotal = (item.price || 0) * (item.quantity || 1);
            itemsHTML += `
                <div class="cart-item" data-item-index="${index}">
                    <img src="${item.image || 'media/logo.png'}" alt="${item.name}" onerror="this.src='media/logo.png'">
                    <div class="cart-item-details">
                        <h3>${item.name}</h3>
                        <p>${item.brand || ''} ${item.model || ''}</p>
                        <p class="item-unit-price">₹${(item.price || 0).toLocaleString('en-IN')} per unit</p>
                    </div>
                    <div class="cart-item-price">
                        ₹${itemTotal.toLocaleString('en-IN')}
                    </div>
                    <div class="cart-item-controls">
                        <button class="qty-btn" onclick="window.unifiedCart.updateQuantity(${index}, ${(item.quantity || 1) - 1})">-</button>
                        <span class="qty-display">${item.quantity || 1}</span>
                        <button class="qty-btn" onclick="window.unifiedCart.updateQuantity(${index}, ${(item.quantity || 1) + 1})">+</button>
                        <button class="remove-btn" onclick="window.unifiedCart.removeItem(${index})">Remove</button>
                    </div>
                </div>
            `;
        });
        itemsHTML += '</div>';

        const totalItems = cartData.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
        const subtotal = cartData.subtotal || cartData.items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
        const gst = cartData.gst || (subtotal * 0.18);
        const discount = cartData.discount || 0;
        const total = cartData.total || (subtotal + gst);

        const summaryHTML = `
            <div class="cart-summary">
                <h2>💰 Order Summary</h2>
                <div class="summary-row">
                    <span>Subtotal (${totalItems} items):</span>
                    <span>₹${subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
                ${discount > 0 ? `
                <div class="summary-row">
                    <span>Discount:</span>
                    <span style="color: #4ade80;">-₹${discount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
                ` : ''}
                <div class="summary-row">
                    <span>GST (18%):</span>
                    <span>₹${gst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
                <div class="summary-row total">
                    <span>Total Amount:</span>
                    <span>₹${total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
                <button class="checkout-btn" onclick="window.unifiedCart.proceedToCheckout()">
                    <span style="font-size: 1.2em; margin-right: 8px;">🛒</span>
                    Proceed to Checkout
                </button>
            </div>
        `;

        container.innerHTML = itemsHTML + summaryHTML;
    }

    // Expose functions globally
    window.unifiedCart = {
        setupAddToCartButtons: setupAddToCartButtons,
        addToCart: addToCart,
        loadCart: loadCart,
        updateQuantity: async function (index, newQuantity) {
            if (newQuantity < 1) {
                this.removeItem(index);
                return;
            }

            const item = cartData.items[index];
            if (!item) return;

            // Try backend first
            if (item.cart_id) {
                const formData = new FormData();
                formData.append('cart_id', item.cart_id);
                formData.append('quantity', newQuantity);

                try {
                    const response = await fetch('backend/cart/update_cart.php', {
                        method: 'POST',
                        body: formData
                    });

                    const data = await response.json();
                    if (data.success) {
                        await loadCart();
                        showNotification('Cart updated', 'success');
                        return;
                    }
                } catch (error) {
                    console.log('Backend update failed, using localStorage');
                }
            }

            // Update localStorage
            cartData.items[index].quantity = newQuantity;
            cartData.subtotal = cartData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            cartData.gst = cartData.subtotal * 0.18;
            cartData.total = cartData.subtotal + cartData.gst;

            saveLocalCart();
            updateCartDisplay();
            showNotification('Cart updated', 'success');
        },

        removeItem: async function (index) {
            if (!confirm('Remove this item from cart?')) return;

            const item = cartData.items[index];
            if (!item) return;

            // Try backend first
            if (item.cart_id) {
                const formData = new FormData();
                formData.append('cart_id', item.cart_id);

                try {
                    const response = await fetch('backend/cart/remove_from_cart.php', {
                        method: 'POST',
                        body: formData
                    });

                    const data = await response.json();
                    if (data.success) {
                        await loadCart();
                        showNotification('Item removed', 'success');
                        return;
                    }
                } catch (error) {
                    console.log('Backend remove failed, using localStorage');
                }
            }

            // Remove from localStorage
            cartData.items.splice(index, 1);
            cartData.subtotal = cartData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            cartData.gst = cartData.subtotal * 0.18;
            cartData.total = cartData.subtotal + cartData.gst;

            saveLocalCart();
            updateCartDisplay();
            showNotification('Item removed', 'success');
        },

        proceedToCheckout: function () {
            if (cartData.items.length === 0) {
                showNotification('Cart is empty', 'warning');
                return;
            }
            window.location.href = 'checkout.html';
        },

        getCart: function () {
            return cartData;
        },

        displayCartPage: displayCartPage,
        updateCartDisplay: updateCartDisplay
    };

    // Show notification
    function showNotification(message, type = 'info') {
        if (window.showToast) {
            window.showToast(message, type);
        } else if (window.ToastNotification) {
            ToastNotification.show(message, type);
        } else {
            alert(message);
        }
    }

    // Initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUnifiedCart);
    } else {
        initUnifiedCart();
    }

    // Listen for cart updates
    window.addEventListener('cartUpdated', function () {
        loadCart();
    });

    // Export for global access
    window.unifiedCart = window.unifiedCart || {};
})();

