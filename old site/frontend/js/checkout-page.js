// Checkout Page JavaScript

// Load order summary from cart on page load
document.addEventListener('DOMContentLoaded', function () {
    loadOrderSummary();
});

// Load and display order summary
async function loadOrderSummary() {
    try {
        // Check if user is authenticated
        let isAuthenticated = false;
        try {
            const authResponse = await fetch('backend/auth_api.php?action=check');
            const authData = await authResponse.json();
            isAuthenticated = authData.authenticated === true;
        } catch (e) {
            console.log('Auth check failed');
        }

        // Try backend API first if authenticated
        let cartData = null;
        if (isAuthenticated) {
            try {
                const response = await fetch('backend/cart_api.php');
                const data = await response.json();
                if (data.status === 'success' && data.cart_items && data.cart_items.length > 0) {
                    cartData = data;
                }
            } catch (e) {
                console.log('Backend cart not available, trying localStorage');
            }
        }

        // Fallback to localStorage if backend not available or not authenticated
        if (!cartData || !cartData.cart_items || cartData.cart_items.length === 0) {
            const localCart = JSON.parse(localStorage.getItem('rmdu_shopping_cart') || '{"items":[]}');
            if (localCart.items && localCart.items.length > 0) {
                const subtotal = localCart.subtotal || localCart.items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
                const gst = localCart.gst || (subtotal * 0.18);
                const shipping = subtotal > 5000 ? 0 : 99;
                const total = localCart.total || (subtotal + gst + shipping);

                cartData = {
                    cart_items: localCart.items.map(item => ({
                        product_name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                        image_url: item.image
                    })),
                    summary: {
                        subtotal: subtotal,
                        tax: gst,
                        shipping: shipping,
                        total: total
                    }
                };
            }
        }

        const orderItemsContainer = document.getElementById('orderItems');

        if (cartData && cartData.cart_items && cartData.cart_items.length > 0) {
            const items = cartData.cart_items;
            let itemsHTML = '';

            items.forEach(item => {
                itemsHTML += `
                    <div class="order-item">
                        <div class="item-details">
                            <div class="item-name">${item.product_name || item.name}</div>
                            <div class="item-price-qty">
                                <span class="item-price">₹${parseFloat(item.price || 0).toLocaleString('en-IN')}</span>
                                <span class="item-qty">Qty: ${item.quantity || 1}</span>
                            </div>
                        </div>
                    </div>
                `;
            });

            orderItemsContainer.innerHTML = itemsHTML;

            // Get totals from backend or calculate
            const subtotal = cartData.summary?.subtotal || items.reduce((sum, item) => sum + (parseFloat(item.price || 0) * parseInt(item.quantity || 1)), 0);
            const tax = cartData.summary?.tax || (subtotal * 0.18);
            const shipping = cartData.summary?.shipping !== undefined ? cartData.summary.shipping : (subtotal > 5000 ? 0 : 99);
            const total = cartData.summary?.total || (subtotal + tax + shipping);

            // Update totals
            document.getElementById('subtotal').textContent = `₹${subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
            document.getElementById('tax').textContent = `₹${tax.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
            document.getElementById('shipping').textContent = shipping > 0 ? `₹${shipping.toLocaleString('en-IN')}` : 'FREE';
            document.getElementById('finalTotal').textContent = `₹${total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

        } else {
            orderItemsContainer.innerHTML = `
                <div class="loading-summary">
                    <p>Your cart is empty!</p>
                    <a href="index.html" style="color: #4ede9a; text-decoration: none; font-weight: 600;">← Continue Shopping</a>
                </div>
            `;
            // Disable checkout button if cart is empty
            const checkoutBtn = document.querySelector('#checkoutForm button[type="submit"]');
            if (checkoutBtn) {
                checkoutBtn.disabled = true;
                checkoutBtn.textContent = 'Cart is Empty';
            }
        }
    } catch (error) {
        console.error('Error loading order summary:', error);
        document.getElementById('orderItems').innerHTML = `
            <div class="loading-summary">Unable to load cart items</div>
        `;
    }
}

// Handle form submission
const checkoutForm = document.getElementById('checkoutForm');
if (checkoutForm) {
    checkoutForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const submitBtn = this.querySelector('button[type="submit"]');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnIcon = submitBtn.querySelector('.btn-icon');

        submitBtn.disabled = true;
        btnIcon.textContent = '⏳';
        btnText.textContent = 'Processing Order...';

        // Get form data
        const formData = {
            shipping_name: document.getElementById('name').value.trim(),
            shipping_email: document.getElementById('email').value.trim(),
            shipping_phone: document.getElementById('phone').value.trim(),
            shipping_address: document.getElementById('address').value.trim(),
            shipping_city: document.getElementById('city').value.trim(),
            shipping_state: document.getElementById('state').value.trim(),
            shipping_pincode: document.getElementById('pincode').value.trim(),
            payment_method: document.querySelector('input[name="payment_method"]:checked')?.value || 'cod'
        };

        // Validate form data
        if (!formData.shipping_name || !formData.shipping_email || !formData.shipping_phone ||
            !formData.shipping_address || !formData.shipping_city || !formData.shipping_state || !formData.shipping_pincode) {
            alert('Please fill in all required fields');
            submitBtn.disabled = false;
            btnIcon.textContent = '🔒';
            btnText.textContent = 'Place Order Securely';
            return;
        }

        try {
            // Check if user is authenticated
            let isAuthenticated = false;
            try {
                const authResponse = await fetch('backend/auth_api.php?action=check');
                const authData = await authResponse.json();
                isAuthenticated = authData.authenticated === true;
            } catch (e) {
                console.log('Auth check failed');
            }

            // Try backend API if authenticated
            if (isAuthenticated) {
                const response = await fetch('backend/checkout.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (data.status === 'success') {
                    btnIcon.textContent = '✅';
                    btnText.textContent = 'Order Placed!';

                    // Clear cart
                    localStorage.removeItem('rmdu_shopping_cart');
                    localStorage.removeItem('cart');

                    // Show success message
                    setTimeout(() => {
                        alert('✅ Order placed successfully! Order Number: ' + (data.order?.order_number || 'N/A'));
                        window.location.href = 'index.html';
                    }, 500);
                    return;
                } else {
                    alert('❌ ' + (data.message || 'Checkout failed. Please try again.'));
                    submitBtn.disabled = false;
                    btnIcon.textContent = '🔒';
                    btnText.textContent = 'Place Order Securely';
                    return;
                }
            } else {
                // For non-authenticated users, show message to login
                if (confirm('You need to login to place an order. Would you like to login first?')) {
                    window.location.href = 'login.html?redirect=checkout';
                } else {
                    submitBtn.disabled = false;
                    btnIcon.textContent = '🔒';
                    btnText.textContent = 'Place Order Securely';
                }
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred during checkout. Please try again.');
            submitBtn.disabled = false;
            btnIcon.textContent = '🔒';
            btnText.textContent = 'Place Order Securely';
        }
    });
}

