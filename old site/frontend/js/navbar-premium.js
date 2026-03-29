/* ===================================
   PREMIUM NAVBAR CONTROLLER
   Rolls-Royce Inspired Navigation
   for RMDU Mobile
   =================================== */

class PremiumNavbar {
    constructor() {
        this.navbar = document.querySelector('.nav') || document.querySelector('.heading');
        this.logo = document.querySelector('.logo');
        this.lastScrollTop = 0;
        this.scrollThreshold = 50; // Pixels before triggering change
        this.isScrolled = false;

        this.init();
    }

    init() {
        if (!this.navbar) {
            console.warn('Navbar element not found');
            return;
        }

        // Add initial classes
        this.navbar.classList.add('premium-navbar');

        // Throttled scroll listener for performance
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    this.handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });

        // Initial check
        this.handleScroll();
    }

    handleScroll() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollDirection = scrollTop > this.lastScrollTop ? 'down' : 'up';

        // Check if scrolled past threshold
        if (scrollTop > this.scrollThreshold && !this.isScrolled) {
            this.onScrolledState();
        } else if (scrollTop <= this.scrollThreshold && this.isScrolled) {
            this.onTopState();
        }

        // Update scroll direction
        this.updateScrollDirection(scrollDirection);

        this.lastScrollTop = scrollTop;
    }

    onScrolledState() {
        this.isScrolled = true;
        this.navbar.classList.add('scrolled');

        // Logo animation
        if (this.logo) {
            this.logo.classList.add('logo-scrolled');
        }
    }

    onTopState() {
        this.isScrolled = false;
        this.navbar.classList.remove('scrolled');

        // Reset logo
        if (this.logo) {
            this.logo.classList.remove('logo-scrolled');
        }
    }

    updateScrollDirection(direction) {
        if (direction === 'down') {
            this.navbar.classList.add('scroll-down');
            this.navbar.classList.remove('scroll-up');
        } else {
            this.navbar.classList.add('scroll-up');
            this.navbar.classList.remove('scroll-down');
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new PremiumNavbar();
    });
} else {
    new PremiumNavbar();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PremiumNavbar;
}
