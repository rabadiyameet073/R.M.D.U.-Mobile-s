// allcart.js - Legacy support (now uses unified-cart.js)
// This file is kept for backward compatibility
(function() {
    'use strict';
    
    const CART_KEY = 'rmdu_shopping_cart'; // ← UNIFIED KEY (matches unified-cart.js)
    
    function getCart() {
        try {
            const data = localStorage.getItem(CART_KEY);
            return JSON.parse(data) || [];
        } catch (e) {
            console.error('Error reading cart:', e);
            return [];
        }
    }
    
    function saveCart(items) {
        try {
            localStorage.setItem(CART_KEY, JSON.stringify(items));
            updateBadge();
            // Trigger storage event for other tabs
            window.dispatchEvent(new Event('cartUpdated'));
        } catch (e) {
            console.error('Error saving cart:', e);
        }
    }
    
    function updateBadge() {
        const items = getCart();
        const count = items.reduce((sum, item) => sum + item.quantity, 0);
        
        const badges = document.querySelectorAll('.cart-badge');
        badges.forEach(badge => {
            badge.textContent = count;
            if (count > 0) {
                badge.style.display = 'inline-flex';
                badge.classList.add('visible');
            } else {
                badge.style.display = 'none';
                badge.classList.remove('visible');
            }
        });
    }
    
    function extractProduct(button) {
        const card = button.closest('.mobile-card');
        if (!card) {
            console.error('❌ No mobile-card found');
            return null;
        }
        
        const img = card.querySelector('img');
        const title = card.querySelector('.mobile-title');
        const price = card.querySelector('.mobile-price');
        
        if (!img || !title || !price) {
            console.error('❌ Missing elements:', {
                hasImage: !!img,
                hasTitle: !!title,
                hasPrice: !!price
            });
            return null;
        }
        
        const name = title.textContent.trim();
        const priceText = price.textContent.trim();
        const priceNum = parseFloat(priceText.replace(/[₹,\s]/g, ''));
        
        if (isNaN(priceNum) || priceNum <= 0) {
            console.error('❌ Invalid price:', priceNum);
            return null;
        }
        
        return {
            id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name: name,
            price: priceNum,
            image: img.src,
            quantity: 1
        };
    }
    
    function addToCart(product) {
        // Use unified cart if available
        if (window.unifiedCart && window.unifiedCart.addToCart) {
            window.unifiedCart.addToCart(product);
            return;
        }
        
        // Fallback to local storage
        const items = getCart();
        const existingIndex = items.findIndex(item => item.id === product.id);
        
        if (existingIndex >= 0) {
            items[existingIndex].quantity += 1;
        } else {
            items.push(product);
        }
        
        saveCart(items);
        showToast('✓ ' + product.name + ' added to cart!');
    }
    
    function showToast(message) {
        // Remove existing toasts
        document.querySelectorAll('.cart-notification').forEach(el => el.remove());
        
        const toast = document.createElement('div');
        toast.className = 'cart-notification';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-weight: bold;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }
    
    function setupBadge() {
        const cartButtons = document.querySelectorAll('.cart');
        
        cartButtons.forEach(btn => {
            const link = btn.querySelector('a');
            if (!link) return;
            
            // Check if badge already exists
            if (link.querySelector('.cart-badge')) {
                return;
            }
            
            link.classList.add('cart-link');
            link.href = 'cart.html';
            link.style.position = 'relative';
            
            const badge = document.createElement('span');
            badge.className = 'cart-badge';
            badge.textContent = '0';
            badge.style.cssText = `
                position: absolute;
                top: -8px;
                right: -10px;
                background: #e31b23;
                color: #fff;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                font-size: 11px;
                display: none;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            `;
            link.appendChild(badge);
        });
    }
    
    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
        setupBadge();
        updateBadge();
    });
    
    // Update badge when page becomes visible
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            updateBadge();
        }
    });
    
    // Listen for storage events from other tabs
    window.addEventListener('storage', function(e) {
        if (e.key === CART_KEY) {
            updateBadge();
        }
    });
    
    // Listen for custom cart update events
    window.addEventListener('cartUpdated', function() {
        updateBadge();
    });
})();
