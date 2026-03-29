/**
 * ============================================
 * RMDU Mobile - API Integration Helper
 * Centralized API calls for frontend
 * ============================================
 */

const RMDUAPI = {
    baseURL: 'backend/',

    /**
     * Generic fetch wrapper
     */
    async request(endpoint, options = {}) {
        const url = this.baseURL + endpoint;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin' // Include cookies for session
        };

        const config = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    /**
     * Authentication APIs
     */
    auth: {
        async register(userData) {
            const formData = new FormData();
            Object.keys(userData).forEach(key => {
                formData.append(key, userData[key]);
            });
            
            return await RMDUAPI.request('register.php', {
                method: 'POST',
                body: formData
            });
        },

        async login(username, password) {
            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);
            
            return await RMDUAPI.request('login_handler.php', {
                method: 'POST',
                body: formData
            });
        },

        async logout() {
            return await RMDUAPI.request('auth_api.php?action=logout', {
                method: 'POST'
            });
        },

        async checkAuth() {
            return await RMDUAPI.request('auth_api.php?action=check');
        }
    },

    /**
     * Product APIs
     */
    products: {
        async getAll(filters = {}) {
            const params = new URLSearchParams(filters);
            return await RMDUAPI.request(`get_products.php?${params}`);
        },

        async getBySlug(slug) {
            return await RMDUAPI.request(`get_product.php?slug=${encodeURIComponent(slug)}`);
        },

        async getById(id) {
            return await RMDUAPI.request(`get_product.php?id=${id}`);
        },

        async search(query, limit = 10) {
            return await RMDUAPI.request(`search_products.php?q=${encodeURIComponent(query)}&limit=${limit}`);
        },

        async filter(filters = {}) {
            const params = new URLSearchParams(filters);
            return await RMDUAPI.request(`filter_products.php?${params}`);
        }
    },

    /**
     * Category & Brand APIs
     */
    categories: {
        async getAll() {
            const data = await RMDUAPI.request('metadata_api.php?type=categories');
            return { ...data, categories: data.data?.categories || [] };
        }
    },

    brands: {
        async getAll() {
            const data = await RMDUAPI.request('metadata_api.php?type=brands');
            return { ...data, brands: data.data?.brands || [] };
        }
    },

    /**
     * Cart APIs
     */
    cart: {
        async get() {
            return await RMDUAPI.request('cart_api.php');
        },

        async add(productId, quantity = 1) {
            return await RMDUAPI.request('cart_api.php', {
                method: 'POST',
                body: JSON.stringify({
                    product_id: productId,
                    quantity: quantity
                })
            });
        },

        async update(cartId, quantity) {
            return await RMDUAPI.request('cart_api.php', {
                method: 'PUT',
                body: JSON.stringify({
                    cart_id: cartId,
                    quantity: quantity
                })
            });
        },

        async remove(cartId) {
            return await RMDUAPI.request(`cart_api.php?cart_id=${cartId}`, {
                method: 'DELETE'
            });
        }
    },

    /**
     * Wishlist APIs
     */
    wishlist: {
        async get() {
            return await RMDUAPI.request('wishlist_api.php');
        },

        async add(productId) {
            return await RMDUAPI.request('wishlist_api.php', {
                method: 'POST',
                body: JSON.stringify({
                    product_id: productId
                })
            });
        },

        async remove(productId) {
            return await RMDUAPI.request(`wishlist_api.php?product_id=${productId}`, {
                method: 'DELETE'
            });
        }
    },

    /**
     * Order APIs
     */
    orders: {
        async getAll() {
            return await RMDUAPI.request('order_api.php');
        },

        async getById(orderId) {
            return await RMDUAPI.request(`order_api.php?order_id=${orderId}`);
        },

        async getByNumber(orderNumber) {
            return await RMDUAPI.request(`order_api.php?order_number=${encodeURIComponent(orderNumber)}`);
        },

        async checkout(shippingData) {
            return await RMDUAPI.request('checkout.php', {
                method: 'POST',
                body: JSON.stringify(shippingData)
            });
        }
    },

    /**
     * Review & Feedback APIs
     */
    reviews: {
        async getByProduct(productId, limit = 10, offset = 0) {
            return await RMDUAPI.request(`feedback_api.php?product_id=${productId}&limit=${limit}&offset=${offset}`);
        },

        async submit(reviewData) {
            return await RMDUAPI.request('feedback_api.php?action=review', {
                method: 'POST',
                body: JSON.stringify(reviewData)
            });
        }
    },

    feedback: {
        async submit(feedbackData) {
            return await RMDUAPI.request('feedback_api.php?action=feedback', {
                method: 'POST',
                body: JSON.stringify(feedbackData)
            });
        }
    }
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RMDUAPI;
}

