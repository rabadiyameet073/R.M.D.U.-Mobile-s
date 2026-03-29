/* ===================================
   SCROLL-SNAP SYSTEM
   Rolls-Royce Inspired Section Navigation
   for RMDU Mobile
   =================================== */

class ScrollSnapSystem {
    constructor() {
        this.container = document.querySelector('.scroll-container');
        this.sections = document.querySelectorAll('.full-screen-section');
        this.indicators = document.querySelectorAll('.section-indicator');
        this.currentSection = 0;

        this.init();
    }

    init() {
        if (!this.container || this.sections.length === 0) {
            return;
        }

        // Set up Intersection Observer for section tracking
        this.setupIntersectionObserver();

        // Set up indicator click handlers
        this.setupIndicatorClicks();

        // Initialize section data attributes
        this.initializeSections();
    }

    initializeSections() {
        this.sections.forEach((section, index) => {
            if (!section.hasAttribute('data-section')) {
                section.setAttribute('data-section', index + 1);
            }
        });
    }

    setupIntersectionObserver() {
        const options = {
            root: null,
            rootMargin: '0px',
            threshold: 0.5 // Section is active when 50% visible
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const sectionIndex = Array.from(this.sections).indexOf(entry.target);
                    this.setActiveSection(sectionIndex);
                }
            });
        }, options);

        // Observe all sections
        this.sections.forEach(section => observer.observe(section));
    }

    setupIndicatorClicks() {
        this.indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => {
                this.scrollToSection(index);
            });
        });
    }

    setActiveSection(index) {
        if (index === this.currentSection) return;

        this.currentSection = index;

        // Update indicators
        this.indicators.forEach((indicator, i) => {
            if (i === index) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        });
    }

    scrollToSection(index) {
        if (index < 0 || index >= this.sections.length) return;

        const targetSection = this.sections[index];
        targetSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }

    // Public API
    next() {
        if (this.currentSection < this.sections.length - 1) {
            this.scrollToSection(this.currentSection + 1);
        }
    }

    previous() {
        if (this.currentSection > 0) {
            this.scrollToSection(this.currentSection - 1);
        }
    }

    goTo(index) {
        this.scrollToSection(index);
    }
}

// Initialize when DOM is ready
let scrollSnapInstance;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        scrollSnapInstance = new ScrollSnapSystem();
    });
} else {
    scrollSnapInstance = new ScrollSnapSystem();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScrollSnapSystem;
}
