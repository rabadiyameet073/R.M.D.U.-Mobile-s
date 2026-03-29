/* ===================================
   PREMIUM ANIMATIONS CONTROLLER
   Scroll-triggered animations and effects
   for RMDU Mobile
   =================================== */

class PremiumAnimations {
    constructor() {
        this.animatedElements = [];
        this.init();
    }

    init() {
        // Find all elements that should animate on scroll
        this.setupScrollReveal();

        // Set up parallax effects
        this.setupParallax();
    }

    setupScrollReveal() {
        // Select elements with scroll-reveal class
        const revealElements = document.querySelectorAll('.scroll-reveal');

        if (revealElements.length === 0) {
            // If no explicit scroll-reveal elements, target common elements
            const autoRevealSelectors = [
                '.hero-headline',
                '.hero-subheadline',
                '.section-title',
                '.problem-text',
                '.solution-card-compact',
                '.trust-card-compact',
                '.comparison-box',
                '.cta-btn'
            ];

            autoRevealSelectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => {
                    if (!el.classList.contains('scroll-reveal')) {
                        el.classList.add('scroll-reveal');
                    }
                });
            });
        }

        // Re-select after auto-adding classes
        const allRevealElements = document.querySelectorAll('.scroll-reveal');

        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -100px 0px', // Trigger slightly before element enters viewport
            threshold: 0.15
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');

                    // Clean up will-change after animation
                    setTimeout(() => {
                        entry.target.classList.add('animation-complete');
                    }, 1200);

                    // Unobserve after revealing
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Observe all reveal elements
        allRevealElements.forEach(element => {
            // Add GPU acceleration
            element.classList.add('gpu-accelerated');
            observer.observe(element);
            this.animatedElements.push(element);
        });
    }

    setupParallax() {
        const parallaxElements = document.querySelectorAll('[data-parallax]');

        if (parallaxElements.length === 0) return;

        let ticking = false;

        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    this.updateParallax(parallaxElements);
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    updateParallax(elements) {
        const scrollTop = window.pageYOffset;

        elements.forEach(element => {
            const speed = parseFloat(element.getAttribute('data-parallax')) || 0.5;
            const yPos = -(scrollTop * speed);
            element.style.transform = `translateY(${yPos}px)`;
        });
    }

    // Utility: Add stagger animation to children
    staggerChildren(parentSelector, animationClass = 'animate-fade-in-up') {
        const parent = document.querySelector(parentSelector);
        if (!parent) return;

        const children = parent.children;
        Array.from(children).forEach((child, index) => {
            child.classList.add(animationClass);
            child.classList.add(`stagger-${Math.min(index + 1, 6)}`);
        });
    }

    // Utility: Trigger animation on element
    animate(element, animationClass) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }

        if (!element) return;

        element.classList.add(animationClass);
        element.classList.add('gpu-accelerated');

        // Clean up after animation
        setTimeout(() => {
            element.classList.add('animation-complete');
        }, 1200);
    }
}

// Initialize when DOM is ready
let premiumAnimationsInstance;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        premiumAnimationsInstance = new PremiumAnimations();
    });
} else {
    premiumAnimationsInstance = new PremiumAnimations();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PremiumAnimations;
}
