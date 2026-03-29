/**
 * Mini Cart Component
 */

class MiniCart {
    constructor() {
        this.cartButton = null;
        this.dropdown = null;
        this.init();
    }

    init() {
        this.createMiniCart();
        this.loadCartCount();
        this.setupEventListeners();
        this.loadCartItems();
    }

    createMiniCart() {
        // Check if cart button already exists
        const existingCart = document.querySelector('.mini-cart-toggle');
        if (existingCart) {
            this.cartButton = existingCart;
            this.dropdown = document.querySelector('.mini-cart-dropdown');
            return;
        }

        // Find the cart button in nav
        const navRight = document.querySelector('.nav-right');
        if (!navRight) return;

        const cartLink = navRight.querySelector('.cart a');
        if (!cartLink) return;

        // Create mini cart structure
        const cartWrapper = document.createElement('div');
        cartWrapper.className = 'mini-cart-wrapper';
        cartWrapper.style.position = 'relative';

        const cartBtn = document.createElement('button');
        cartBtn.className = 'mini-cart-toggle';
        cartBtn.innerHTML = '🛒';
        cartBtn.setAttribute('aria-label', 'Shopping Cart');

        const badge = document.createElement('span');
        badge.className = 'cart-badge';
        badge.id = 'cartBadge';
        badge.textContent = '0';

        const dropdown = document.createElement('div');
        dropdown.className = 'mini-cart-dropdown';
        dropdown.innerHTML = `
            <div class="mini-cart-header">
                <h3>🛒 Your Cart</h3>
                <button class="mini-cart-close" aria-label="Close cart">&times;</button>
            </div>
            <div class="mini-cart-items" id="miniCartItems">
                <div class="mini-cart-empty">Your cart is empty</div>
            </div>
            <div class="mini-cart-footer" id="miniCartFooter" style="display: none;">
                <div class="mini-cart-total">
                    <span class="mini-cart-total-label">Total:</span>
                    <span class="mini-cart-total-amount" id="miniCartTotal">₹0</span>
                </div>
                <div class="mini-cart-actions">
                    <a href="cart.html" class="mini-cart-btn mini-cart-btn-view">View Cart</a>
                    <a href="checkout.html" class="mini-cart-btn mini-cart-btn-checkout">Checkout</a>
                </div>
            </div>
        `;

        cartBtn.appendChild(badge);
        cartWrapper.appendChild(cartBtn);
        cartWrapper.appendChild(dropdown);

        // Replace or add to nav
        if (cartLink.parentElement) {
            cartLink.parentElement.replaceWith(cartWrapper);
        } else {
            navRight.appendChild(cartWrapper);
        }

        this.cartButton = cartBtn;
        this.dropdown = dropdown;
    }

    setupEventListeners() {
        if (!this.cartButton || !this.dropdown) return;

        // Toggle dropdown
        this.cartButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropdown.classList.toggle('active');
        });

        // Close button
        const closeBtn = this.dropdown.querySelector('.mini-cart-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.dropdown.classList.remove('active');
            });
        }

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!this.dropdown.contains(e.target) && !this.cartButton.contains(e.target)) {
                this.dropdown.classList.remove('active');
            }
        });

        // Prevent dropdown close on inside click
        this.dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    async loadCartCount() {
        try {
            const response = await fetch('backend/cart/get_cart.php');
            const data = await response.json();

            if (data.success && data.data && data.data.items) {
                const count = data.data.items.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0);
                this.updateCartCount(count);
            } else {
                this.updateCartCount(0);
            }
        } catch (error) {
            console.error('Error loading cart count:', error);
        }
    }

    async loadCartItems() {
        try {
            const response = await fetch('backend/cart/get_cart.php');
            const data = await response.json();
            const itemsContainer = document.getElementById('miniCartItems');
            const footer = document.getElementById('miniCartFooter');

            if (!itemsContainer) return;

            if (data.success && data.data && data.data.items && data.data.items.length > 0) {
                const items = data.data.items;
                let total = 0;

                itemsContainer.innerHTML = items.map(item => {
                    const itemTotal = parseFloat(item.price) * parseInt(item.quantity);
                    total += itemTotal;
                    return `
                        <div class="mini-cart-item">
                            <img src="${item.image || 'media/logo.png'}" alt="${item.name}" class="mini-cart-item-image">
                            <div class="mini-cart-item-details">
                                <div class="mini-cart-item-name">${item.name}</div>
                                <div class="mini-cart-item-price">₹${parseFloat(item.price).toLocaleString('en-IN')}</div>
                                <div class="mini-cart-item-qty">Qty: ${item.quantity}</div>
                            </div>
                            <button class="mini-cart-item-remove" onclick="miniCart.removeItem(${item.product_id || item.id})" aria-label="Remove item">
                                &times;
                            </button>
                        </div>
                    `;
                }).join('');

                document.getElementById('miniCartTotal').textContent = `₹${total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
                footer.style.display = 'block';
            } else {
                itemsContainer.innerHTML = '<div class="mini-cart-empty">Your cart is empty</div>';
                footer.style.display = 'none';
            }
        } catch (error) {
            console.error('Error loading cart items:', error);
        }
    }

    async removeItem(productId) {
        try {
            const formData = new FormData();
            formData.append('product_id', productId);

            const response = await fetch('backend/cart/remove_from_cart.php', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                if (window.showToast) {
                    window.showToast('Item removed from cart', 'success');
                }
                this.loadCartItems();
                this.loadCartCount();
            } else {
                if (window.showToast) {
                    window.showToast(data.message || 'Failed to remove item', 'error');
                }
            }
        } catch (error) {
            console.error('Error removing item:', error);
            if (window.showToast) {
                window.showToast('Error removing item', 'error');
            }
        }
    }

    updateCartCount(count) {
        const badge = document.getElementById('cartBadge');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'block' : 'none';
        }
    }
}

// Initialize mini cart on page load
let miniCart;
document.addEventListener('DOMContentLoaded', function() {
    miniCart = new MiniCart();
    
    // Reload cart on storage event (for cross-tab updates)
    window.addEventListener('storage', () => {
        miniCart.loadCartCount();
        miniCart.loadCartItems();
    });
});

// Make it globally available
window.miniCart = miniCart;
