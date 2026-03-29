class WishlistManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupWishlistButtons();
        this.loadWishlistStatus();
    }

    setupWishlistButtons() {
        const productCards = document.querySelectorAll('.mobile-card');
        productCards.forEach(card => {
            if (!card.querySelector('.wishlist-btn')) {
                const title = card.querySelector('.mobile-title')?.textContent.trim() || '';
                const priceElement = card.querySelector('.mobile-price');
                const price = priceElement ? parseInt(priceElement.textContent.replace(/[₹,]/g, '')) : 0;
                const image = card.querySelector('img')?.src || '';

                const wishlistBtn = document.createElement('button');
                wishlistBtn.className = 'wishlist-btn';
                wishlistBtn.setAttribute('aria-label', 'Add to wishlist');
                wishlistBtn.innerHTML = '♡';
                wishlistBtn.dataset.productName = title;
                wishlistBtn.dataset.productPrice = price;
                wishlistBtn.dataset.productImage = image;

                const cardPosition = window.getComputedStyle(card).position;
                if (cardPosition === 'static') {
                    card.style.position = 'relative';
                }

                wishlistBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleWishlist(title, price, image);
                });

                card.appendChild(wishlistBtn);
            }
        });
    }

    async toggleWishlist(productName, productPrice, productImage) {
        try {
            const sessionCheck = await fetch('backend/session.php?action=check');
            const sessionData = await sessionCheck.json();

            if (!sessionData.logged_in) {
                if (window.showToast) {
                    window.showToast('Please login to use wishlist', 'warning');
                } else {
                    alert('Please login to use wishlist');
                }
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
                return;
            }

            const formData = new FormData();
            formData.append('product_name', productName);
            formData.append('product_price', productPrice);
            formData.append('product_image', productImage);

            const response = await fetch('backend/wishlist/toggle.php', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                const btn = document.querySelector(`[data-product-name="${productName}"]`);
                if (btn) {
                    if (data.is_added) {
                        btn.classList.add('active');
                        btn.innerHTML = '❤';
                        if (window.showToast) {
                            window.showToast('Added to wishlist', 'success');
                        }
                    } else {
                        btn.classList.remove('active');
                        btn.innerHTML = '♡';
                        if (window.showToast) {
                            window.showToast('Removed from wishlist', 'info');
                        }
                    }
                }
            } else {
                if (window.showToast) {
                    window.showToast(data.message || 'Error updating wishlist', 'error');
                }
            }
        } catch (error) {
            console.error('Error toggling wishlist:', error);
            if (window.showToast) {
                window.showToast('Error updating wishlist', 'error');
            }
        }
    }

    async loadWishlistStatus() {
        try {
            const sessionCheck = await fetch('backend/session.php?action=check');
            const sessionData = await sessionCheck.json();

            if (!sessionData.logged_in) return;

            const response = await fetch('backend/wishlist/get.php');
            const data = await response.json();

            if (data.success && data.items) {
                data.items.forEach(item => {
                    const btn = document.querySelector(`[data-product-name="${item.name}"]`);
                    if (btn) {
                        btn.classList.add('active');
                        btn.innerHTML = '❤';
                    }
                });
            }
        } catch (error) {
            console.error('Wishlist load error:', error);
        }
    }
}

document.addEventListener('DOMContentLoaded', function () {
    window.wishlistManager = new WishlistManager();
});
