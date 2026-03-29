/**
 * ============================================
 * RMDU Mobiles - Phone Inventory Renderer
 * Dynamically loads phones from database API
 * ============================================
 */

class PhoneInventoryRenderer {
    constructor(apiUrl = 'backend/php/get_phones.php') {
        this.apiUrl = apiUrl;
        this.phones = [];
    }

    /**
     * Fetch phones from database via API
     */
    async fetchPhones(category = 'all', filters = {}) {
        try {
            // Default sorting by price ascending
            const defaultFilters = {
                sort_by: 'price',
                sort_order: 'asc',
                ...filters
            };

            const params = new URLSearchParams({
                category: category,
                ...defaultFilters
            });

            const response = await fetch(`${this.apiUrl}?${params}`);
            const data = await response.json();

            if (data.success) {
                this.phones = data.data;
                return this.phones;
            } else {
                console.error('API Error:', data.error);
                return [];
            }
        } catch (error) {
            console.error('Fetch Error:', error);
            return [];
        }
    }

    /**
     * Generate VFM rating stars
     */
    generateVFMRating(rating) {
        const fullStars = Math.floor(rating);
        const halfStar = rating % 1 >= 0.5 ? 1 : 0;
        const emptyStars = 10 - fullStars - halfStar;

        let starsHTML = '<div class="vfm-rating"><div class="stars">';

        // Full stars
        for (let i = 0; i < fullStars; i++) {
            starsHTML += '<span class="star">★</span>';
        }

        // Half star
        if (halfStar) {
            starsHTML += '<span class="star">⯪</span>';
        }

        // Empty stars (showing 5 total for visual balance)
        const totalShown = Math.min(5, fullStars + halfStar);
        for (let i = fullStars + halfStar; i < 5; i++) {
            starsHTML += '<span class="star empty">★</span>';
        }

        starsHTML += `</div><span class="score">${rating}/10</span></div>`;
        return starsHTML;
    }

    /**
     * Generate feature badges
     */
    generateFeatureBadges(phone) {
        const badges = [];

        // Display badge
        if (phone.refresh_rate && parseInt(phone.refresh_rate) >= 120) {
            badges.push(`<span class="feature-badge display">${phone.refresh_rate}</span>`);
        }

        // Battery badge
        if (phone.battery_capacity >= 7000) {
            badges.push(`<span class="feature-badge battery">${phone.battery_capacity}mAh</span>`);
        }

        // Charging badge
        if (phone.charging_speed && parseInt(phone.charging_speed) >= 60) {
            badges.push(`<span class="feature-badge charging">${phone.charging_speed}</span>`);
        }

        // Gaming badge
        if (phone.category === 'Gaming') {
            badges.push('<span class="feature-badge gaming">Gaming</span>');
        }

        // Camera badge
        if (phone.category === 'Camera' && phone.rear_camera && phone.rear_camera.includes('200MP')) {
            badges.push('<span class="feature-badge camera">200MP</span>');
        }

        return badges.length > 0 ? `<div class="feature-badges">${badges.join('')}</div>` : '';
    }

    /**
     * Generate status indicator
     */
    generateStatusIndicator(status) {
        let statusClass = 'available';
        if (status.toLowerCase().includes('new launch')) {
            statusClass = 'new-launch';
        } else if (status.toLowerCase().includes('best seller')) {
            statusClass = 'best-seller';
        } else if (status.toLowerCase().includes('pre-order')) {
            statusClass = 'pre-order';
        }

        return `<div class="status-indicator ${statusClass}">${status}</div>`;
    }

    /**
     * Generate battery indicator
     */
    generateBatteryIndicator(capacity) {
        const isMega = capacity >= 7000;
        return `
            <div class="battery-indicator ${isMega ? 'mega-battery' : ''}">
                <span class="icon">🔋</span>
                <span class="capacity">${capacity}mAh</span>
            </div>
        `;
    }

    /**
     * Render a single phone card
     */
    renderPhoneCard(phone) {
        const priceTierClass = `price-tier-${phone.price_tier}`;
        const formattedPrice = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(phone.price);

        return `
            <div class="${priceTierClass}">
                <div class="phone-card" data-phone-id="${phone.phone_id}">
                    ${this.generateStatusIndicator(phone.status)}
                    
                    <img src="${phone.image_url || 'media/placeholder-phone.png'}" 
                         alt="${phone.device_name}" 
                         class="phone-image"
                         loading="lazy">
                    
                    <h3 class="phone-name">${phone.device_name}</h3>
                    <p class="phone-brand">${phone.brand}</p>
                    
                    <div class="phone-specs">
                        <div class="spec-item">
                            <span class="spec-icon">📱</span>
                            <span class="spec-text">${phone.display_size} ${phone.display_type}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-icon">⚡</span>
                            <span class="spec-text">${phone.processor}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-icon">📸</span>
                            <span class="spec-text">${phone.rear_camera ? phone.rear_camera.split(',')[0] : 'N/A'}</span>
                        </div>
                    </div>
                    
                    ${this.generateBatteryIndicator(phone.battery_capacity)}
                    ${this.generateVFMRating(phone.vfm_rating)}
                    ${this.generateFeatureBadges(phone)}
                    
                    <div class="price-badge">${formattedPrice}</div>
                    
                    <button class="more-info-btn" onclick="openPhoneModal('${phone.device_name}')">
                        More Info
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render phones to container
     */
    async renderToContainer(containerId, category = 'all', filters = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        // Show loading state
        container.innerHTML = '<div class="loading">Loading phones...</div>';

        // Fetch phones
        const phones = await this.fetchPhones(category, filters);

        if (phones.length === 0) {
            container.innerHTML = '<div class="no-phones">No phones found</div>';
            return;
        }

        // Render all phone cards
        const html = phones.map(phone => this.renderPhoneCard(phone)).join('');
        container.innerHTML = html;

        // Add animation class after render
        setTimeout(() => {
            container.querySelectorAll('.phone-card').forEach((card, index) => {
                setTimeout(() => {
                    card.classList.add('fade-in');
                }, index * 50);
            });
        }, 100);
    }

    /**
     * Group phones by price tier
     */
    async renderGroupedByPriceTier(containerId, category = 'all') {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '<div class="loading">Loading phones...</div>';

        const phones = await this.fetchPhones(category);

        // Group by price tier
        const grouped = {};
        phones.forEach(phone => {
            const tier = phone.price_tier;
            if (!grouped[tier]) {
                grouped[tier] = [];
            }
            grouped[tier].push(phone);
        });

        // Sort phones within each tier by price
        Object.keys(grouped).forEach(tier => {
            grouped[tier].sort((a, b) => a.price - b.price);
        });

        // Render each group
        let html = '';
        const tierOrder = ['10k', '15k', '20k', '30k', '40k', '50k', 'flagship', 'refurbished'];

        tierOrder.forEach(tier => {
            if (grouped[tier] && grouped[tier].length > 0) {
                const tierName = tier === 'refurbished' ? 'Refurbished Legends' : `₹${tier} Range`;
                html += `
                    <div class="price-tier-section">
                        <h2 class="tier-heading ${tier}">${tierName} (${grouped[tier].length})</h2>
                        <div class="phone-grid">
                            ${grouped[tier].map(phone => this.renderPhoneCard(phone)).join('')}
                        </div>
                    </div>
                `;
            }
        });

        container.innerHTML = html;
    }
}

// Initialize global renderer
const phoneRenderer = new PhoneInventoryRenderer();

// Auto-load on category pages
document.addEventListener('DOMContentLoaded', () => {
    // Detect category from page
    const pagePath = window.location.pathname;
    let category = 'all';
    let containerId = 'phone-inventory-container';

    if (pagePath.includes('BudgetKiller')) {
        category = 'Budget';
        phoneRenderer.renderGroupedByPriceTier(containerId, category);
    } else if (pagePath.includes('GamingGuru')) {
        category = 'Gaming';
        phoneRenderer.renderToContainer(containerId, category);
    } else if (pagePath.includes('CameraChampion')) {
        category = 'Camera';
        phoneRenderer.renderToContainer(containerId, category);
    } else if (pagePath.includes('BatteryBeast')) {
        category = 'Battery';
        phoneRenderer.renderToContainer(containerId, category);
    } else if (pagePath.includes('GOATLegends')) {
        category = 'GOAT';
        phoneRenderer.renderToContainer(containerId, category);
    }
});
