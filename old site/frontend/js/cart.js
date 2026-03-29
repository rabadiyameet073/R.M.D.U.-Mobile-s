class Cart {
    constructor() {
        this.items = JSON.parse(localStorage.getItem('cart')) || [];
        this.loadCart();
    }

    addItem(item) {
        const existingItem = this.items.find(cartItem => cartItem.name === item.name);

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.items.push({
                ...item,
                quantity: 1
            });
        }

        this.saveCart();
        this.loadCart();
        this.showNotification(`${item.name} added to cart!`);
    }

    removeItem(itemName) {
        this.items = this.items.filter(item => item.name !== itemName);
        this.saveCart();
        this.loadCart();
    }

    updateQuantity(itemName, newQuantity) {
        const item = this.items.find(cartItem => cartItem.name === itemName);
        if (item) {
            if (newQuantity <= 0) {
                this.removeItem(itemName);
            } else {
                item.quantity = newQuantity;
                this.saveCart();
                this.loadCart();
            }
        }
    }

    saveCart() {
        localStorage.setItem('cart', JSON.stringify(this.items));
    }

    loadCart() {
        const cartContent = document.getElementById('cart-content');
        const cartSummary = document.getElementById('cart-summary');

        if (this.items.length === 0) {
            cartContent.innerHTML = `
                <div class="empty-cart">
                    <h2>Your cart is empty</h2>
                    <p>Add some awesome phones to get started!</p>
                    <a href="index.html" class="continue-shopping">Start Shopping</a>
                </div>
            `;
            cartSummary.style.display = 'none';
            return;
        }

        let cartHTML = '<div class="cart-items">';
        let total = 0;

        this.items.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;

            cartHTML += `
                <div class="cart-item">
                    <img src="${item.image}" alt="${item.name}">
                    <div class="cart-item-details">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-price">₹${item.price.toLocaleString()}</div>
                    </div>
                    <div class="quantity-controls">
                        <button class="qty-btn" onclick="cart.updateQuantity('${item.name}', ${item.quantity - 1})">-</button>
                        <span class="quantity">${item.quantity}</span>
                        <button class="qty-btn" onclick="cart.updateQuantity('${item.name}', ${item.quantity + 1})">+</button>
                    </div>
                    <button class="remove-btn" onclick="cart.removeItem('${item.name}')">Remove</button>
                </div>
            `;
        });

        cartHTML += '</div>';
        cartContent.innerHTML = cartHTML;

        document.getElementById('total-amount').textContent = `Total: ₹${total.toLocaleString()}`;
        cartSummary.style.display = 'block';
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'cart-notification';
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    getCartCount() {
        return this.items.reduce((total, item) => total + item.quantity, 0);
    }
}

const cart = new Cart();

function checkout() {
    if (cart.items.length === 0) {
        alert('Your cart is empty!');
        return;
    }

    // Convert cart items to the format expected by checkout
    const cartData = cart.items.map(item => ({
        product_id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
    }));

    localStorage.setItem('checkout_cart', JSON.stringify(cartData));
    localStorage.setItem('checkout_total', cart.getTotalAmount());

    window.location.href = 'checkout.html';
}

Cart.prototype.getTotalAmount = function () {
    return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
}
