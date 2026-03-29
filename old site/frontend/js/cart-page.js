// Cart Page JavaScript - Backend Integrated

// Load cart on page load
document.addEventListener('DOMContentLoaded', function () {
    loadCart();
});

// Load cart from backend or localStorage
async function loadCart() {
    const container = document.getElementById('cartContainer');
    if (!container) return;

    container.innerHTML = '<div class="loading-cart">Loading your cart...</div>';

    try {
        // Try backend first
        const response = await fetch('backend/cart_api.php');
        const data = await response.json();

        if (data.status === 'success' && data.cart_items && data.cart_items.length > 0) {
            displayCart(data.cart_items, data.summary);
            return;
        }
    } catch (error) {
        console.log('Backend cart not available, trying localStorage');
    }

    // Fallback to localStorage
    const localCart = JSON.parse(localStorage.getItem('rmdu_shopping_cart') || '{"items":[]}');
    if (localCart.items && localCart.items.length > 0) {
        const subtotal = localCart.subtotal || localCart.items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
        const gst = localCart.gst || (subtotal * 0.18);
        const shipping = subtotal > 5000 ? 0 : 99;
        const total = localCart.total || (subtotal + gst + shipping);

        displayCart(localCart.items, {
            subtotal: subtotal,
            tax: gst,
            shipping: shipping,
            total: total,
            item_count: localCart.items.reduce((sum, item) => sum + (item.quantity || 1), 0)
        });
    } else {
        showEmptyCart();
    }
}

function displayCart(cartItems, summary) {
    const container = document.getElementById('cartContainer');
    if (!container) return;

    if (!cartItems || cartItems.length === 0) {
        showEmptyCart();
        return;
    }

    let itemsHTML = '<div class="cart-items">';
    cartItems.forEach((item, index) => {
        const itemPrice = parseFloat(item.price || 0);
        const itemQuantity = parseInt(item.quantity || 1);
        const itemTotal = itemPrice * itemQuantity;
        const itemName = item.product_name || item.name || 'Product';
        const itemImage = item.image_url || item.image || 'media/logo.png';
        const cartId = item.cart_id || null;

        itemsHTML += `
            <div class="cart-item" data-item-index="${index}" data-cart-id="${cartId || ''}" data-product-id="${item.product_id || item.id || ''}">
                <img src="${itemImage}" alt="${itemName}" onerror="this.src='media/logo.png'">
                <div class="cart-item-details">
                    <h3>${itemName}</h3>
                    <p class="item-unit-price">₹${itemPrice.toLocaleString('en-IN')} per unit</p>
                </div>
                <div class="cart-item-price">
                    <strong>₹${itemTotal.toLocaleString('en-IN')}</strong>
                </div>
                <div class="cart-item-controls">
                    <button class="qty-btn" onclick="updateCartQuantity(${index}, ${itemQuantity - 1})">-</button>
                    <span class="qty-display">${itemQuantity}</span>
                    <button class="qty-btn" onclick="updateCartQuantity(${index}, ${itemQuantity + 1})">+</button>
                    <button class="remove-btn" onclick="removeCartItem(${index})">Remove</button>
                </div>
            </div>
        `;
    });
    itemsHTML += '</div>';

    // Calculate totals from summary or items
    const subtotal = summary?.subtotal || cartItems.reduce((sum, item) => sum + (parseFloat(item.price || 0) * parseInt(item.quantity || 1)), 0);
    const tax = summary?.tax || (subtotal * 0.18);
    const shipping = summary?.shipping || (subtotal > 5000 ? 0 : 99);
    const total = summary?.total || (subtotal + tax + shipping);
    const itemCount = summary?.item_count || cartItems.reduce((sum, item) => sum + parseInt(item.quantity || 1), 0);

    const summaryHTML = `
        <div class="cart-summary">
            <h2>💰 Order Summary</h2>
            <div class="summary-row">
                <span>Subtotal (${itemCount} item${itemCount !== 1 ? 's' : ''}):</span>
                <span>₹${subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
            <div class="summary-row">
                <span>Shipping:</span>
                <span>${shipping > 0 ? '₹' + shipping.toLocaleString('en-IN') : 'FREE'}</span>
            </div>
            <div class="summary-row">
                <span>GST (18%):</span>
                <span>₹${tax.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
            <div class="summary-divider"></div>
            <div class="summary-row total">
                <span><strong>Total Amount:</strong></span>
                <span style="font-size: 1.5em; font-weight: 700; color: #4ade80;">₹${total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
            <button class="checkout-btn" onclick="proceedToCheckout()">
                <span style="font-size: 1.2em; margin-right: 8px;">🛒</span>
                Proceed to Checkout
            </button>
            <a href="index.html" class="continue-shopping-btn">Continue Shopping</a>
        </div>
    `;

    container.innerHTML = itemsHTML + summaryHTML;
}

function showEmptyCart() {
    const container = document.getElementById('cartContainer');
    if (!container) return;

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
}

// Update cart item quantity
async function updateCartQuantity(index, newQuantity) {
    if (newQuantity < 1) {
        removeCartItem(index);
        return;
    }

    const container = document.getElementById('cartContainer');
    const cartItem = container.querySelector(`[data-item-index="${index}"]`);
    if (!cartItem) return;

    const cartId = cartItem.getAttribute('data-cart-id');
    const productId = cartItem.getAttribute('data-product-id');

    try {
        // Try backend update if cart_id exists
        if (cartId) {
            const response = await fetch('backend/cart_api.php', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cart_id: parseInt(cartId), quantity: newQuantity })
            });

            const data = await response.json();
            if (data.status === 'success') {
                loadCart(); // Reload cart
                if (window.showToast) {
                    window.showToast('Cart updated', 'success');
                }
                return;
            }
        }

        // Fallback to localStorage
        const localCart = JSON.parse(localStorage.getItem('rmdu_shopping_cart') || '{"items":[]}');
        if (localCart.items[index]) {
            localCart.items[index].quantity = newQuantity;
            localCart.subtotal = localCart.items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
            localCart.gst = localCart.subtotal * 0.18;
            localCart.total = localCart.subtotal + localCart.gst + (localCart.subtotal > 5000 ? 0 : 99);
            localStorage.setItem('rmdu_shopping_cart', JSON.stringify(localCart));
            loadCart();
        }
    } catch (error) {
        console.error('Update cart error:', error);
        alert('Failed to update cart. Please try again.');
    }
}

// Remove cart item
async function removeCartItem(index) {
    if (!confirm('Remove this item from cart?')) return;

    const container = document.getElementById('cartContainer');
    const cartItem = container.querySelector(`[data-item-index="${index}"]`);
    if (!cartItem) return;

    const cartId = cartItem.getAttribute('data-cart-id');

    try {
        // Try backend remove if cart_id exists
        if (cartId) {
            const response = await fetch(`backend/cart_api.php?cart_id=${cartId}`, {
                method: 'DELETE'
            });

            const data = await response.json();
            if (data.status === 'success') {
                loadCart(); // Reload cart
                if (window.showToast) {
                    window.showToast('Item removed from cart', 'success');
                }
                return;
            }
        }

        // Fallback to localStorage
        const localCart = JSON.parse(localStorage.getItem('rmdu_shopping_cart') || '{"items":[]}');
        localCart.items.splice(index, 1);
        localCart.subtotal = localCart.items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
        localCart.gst = localCart.subtotal * 0.18;
        localCart.total = localCart.subtotal + localCart.gst + (localCart.subtotal > 5000 ? 0 : 99);
        localStorage.setItem('rmdu_shopping_cart', JSON.stringify(localCart));
        loadCart();
    } catch (error) {
        console.error('Remove cart error:', error);
        alert('Failed to remove item. Please try again.');
    }
}

// Proceed to checkout
function proceedToCheckout() {
    // Check if cart is empty
    const container = document.getElementById('cartContainer');
    const cartItems = container.querySelectorAll('.cart-item');
    
    if (cartItems.length === 0) {
        alert('Your cart is empty!');
        return;
    }

    // Check if user is logged in
    fetch('backend/auth_api.php?action=check')
        .then(response => response.json())
        .then(data => {
            if (data.authenticated) {
                // User is logged in, proceed to checkout
                window.location.href = 'checkout.html';
            } else {
                // User not logged in, redirect to login
                if (confirm('You need to login to checkout. Go to login page?')) {
                    window.location.href = 'login.html?redirect=checkout';
                }
            }
        })
        .catch(error => {
            console.error('Auth check error:', error);
            // If auth check fails, still allow checkout (for localStorage cart)
            window.location.href = 'checkout.html';
        });
}
