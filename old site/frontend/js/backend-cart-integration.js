/**
 * ============================================
 * Backend Cart Integration
 * Integrates localStorage cart with backend API
 * ============================================
 */

class BackendCartIntegration {
    constructor() {
        this.isAuthenticated = false;
        this.checkAuth();
    }

    async checkAuth() {
        try {
            const response = await fetch('backend/auth_api.php?action=check');
            const data = await response.json();
            this.isAuthenticated = data.authenticated === true;
        } catch (e) {
            this.isAuthenticated = false;
        }
    }

    async addToCart(productId, quantity = 1) {
        if (!this.isAuthenticated) {
            // Use localStorage for non-authenticated users
            return this.addToLocalCart(productId, quantity);
        }

        try {
            const response = await fetch('backend/cart_api.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    product_id: productId,
                    quantity: quantity
                })
            });

            const data = await response.json();
            if (data.status === 'success') {
                this.updateCartDisplay();
                return { success: true, message: data.message };
            } else {
                // Fallback to localStorage
                return this.addToLocalCart(productId, quantity);
            }
        } catch (error) {
            console.error('Backend cart error:', error);
            return this.addToLocalCart(productId, quantity);
        }
    }

    async getCart() {
        if (!this.isAuthenticated) {
            return this.getLocalCart();
        }

        try {
            const response = await fetch('backend/cart_api.php');
            const data = await response.json();
            
            if (data.status === 'success') {
                return {
                    items: data.cart_items || [],
                    summary: data.summary || {}
                };
            }
        } catch (error) {
            console.error('Backend cart fetch error:', error);
        }

        return this.getLocalCart();
    }

    async updateQuantity(cartId, quantity) {
        if (!this.isAuthenticated || !cartId) {
            return this.updateLocalCartQuantity(cartId, quantity);
        }

        try {
            const response = await fetch('backend/cart_api.php', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cart_id: cartId,
                    quantity: quantity
                })
            });

            const data = await response.json();
            if (data.status === 'success') {
                this.updateCartDisplay();
                return { success: true };
            }
        } catch (error) {
            console.error('Update cart error:', error);
        }

        return this.updateLocalCartQuantity(cartId, quantity);
    }

    async removeFromCart(cartId) {
        if (!this.isAuthenticated || !cartId) {
            return this.removeFromLocalCart(cartId);
        }

        try {
            const response = await fetch(`backend/cart_api.php?cart_id=${cartId}`, {
                method: 'DELETE'
            });

            const data = await response.json();
            if (data.status === 'success') {
                this.updateCartDisplay();
                return { success: true };
            }
        } catch (error) {
            console.error('Remove cart error:', error);
        }

        return this.removeFromLocalCart(cartId);
    }

    // LocalStorage fallback methods
    addToLocalCart(productId, quantity) {
        const cart = this.getLocalCart();
        const existingIndex = cart.items.findIndex(item => item.product_id === productId);
        
        if (existingIndex >= 0) {
            cart.items[existingIndex].quantity += quantity;
        } else {
            cart.items.push({
                product_id: productId,
                quantity: quantity
            });
        }

        this.saveLocalCart(cart);
        this.updateCartDisplay();
        return { success: true, message: 'Added to cart' };
    }

    getLocalCart() {
        try {
            const stored = localStorage.getItem('rmdu_shopping_cart');
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('Local cart error:', e);
        }
        return { items: [], summary: { subtotal: 0, total: 0 } };
    }

    saveLocalCart(cart) {
        localStorage.setItem('rmdu_shopping_cart', JSON.stringify(cart));
        window.dispatchEvent(new Event('cartUpdated'));
    }

    updateLocalCartQuantity(productId, quantity) {
        const cart = this.getLocalCart();
        const item = cart.items.find(i => i.product_id === productId);
        if (item) {
            item.quantity = quantity;
            this.saveLocalCart(cart);
            this.updateCartDisplay();
        }
        return { success: true };
    }

    removeFromLocalCart(productId) {
        const cart = this.getLocalCart();
        cart.items = cart.items.filter(i => i.product_id !== productId);
        this.saveLocalCart(cart);
        this.updateCartDisplay();
        return { success: true };
    }

    updateCartDisplay() {
        this.getCart().then(cart => {
            const totalItems = cart.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
            
            // Update cart badge
            document.querySelectorAll('.cart-badge, #cartBadge').forEach(badge => {
                badge.textContent = totalItems;
                badge.style.display = totalItems > 0 ? 'block' : 'none';
            });

            // Dispatch event for other components
            window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));
        });
    }
}

// Initialize global instance
window.backendCart = new BackendCartIntegration();

