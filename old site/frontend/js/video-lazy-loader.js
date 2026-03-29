/**
 * =========================================
 * Video Lazy Loader - Performance Optimized
 * Loads videos only when they're about to enter viewport
 * Connection-aware and priority-based loading
 * =========================================
 */

class VideoLazyLoader {
    constructor() {
        this.lazyVideos = document.querySelectorAll('.lazy-video');
        this.loadedVideos = new Set();
        this.connectionSpeed = this.getConnectionSpeed();
        this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.init();
    }

    getConnectionSpeed() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection) {
            return connection.effectiveType; // '4g', '3g', '2g', 'slow-2g'
        }
        return '4g'; // Default to 4g if not available
    }

    init() {
        if (this.lazyVideos.length === 0) return;

        // Adjust loading margin based on connection speed
        let rootMargin = '200px'; // Default for fast connections
        if (this.connectionSpeed === '3g') {
            rootMargin = '100px';
        } else if (this.connectionSpeed === '2g' || this.connectionSpeed === 'slow-2g') {
            rootMargin = '50px';
        }

        // Use Intersection Observer for efficient video loading
        const observerOptions = {
            root: null,
            rootMargin: rootMargin,
            threshold: 0.01
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Use requestIdleCallback if available for non-blocking load
                    if ('requestIdleCallback' in window) {
                        requestIdleCallback(() => {
                            this.loadVideo(entry.target);
                        }, { timeout: 2000 });
                    } else {
                        setTimeout(() => this.loadVideo(entry.target), 0);
                    }
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Observe all lazy videos
        this.lazyVideos.forEach(video => {
            observer.observe(video);
        });

        // Preload first video immediately for better UX
        this.preloadFirstVideo();
    }

    preloadFirstVideo() {
        // Load the first visible video immediately
        const firstVideo = document.querySelector('.section-video:not(.lazy-video)');
        if (firstVideo && firstVideo.tagName === 'VIDEO') {
            // Optimize first video for immediate playback
            firstVideo.preload = 'metadata';
        }
    }

    loadVideo(video) {
        // Prevent loading the same video twice
        if (this.loadedVideos.has(video)) return;

        const videoSrc = video.getAttribute('data-src');
        if (!videoSrc) return;

        // Set source for video element
        const source = video.querySelector('source');
        if (source) {
            const dataSrc = source.getAttribute('data-src');
            if (dataSrc) {
                source.src = dataSrc;
            }
        }

        // Configure video for optimal performance
        video.preload = this.connectionSpeed === '4g' ? 'auto' : 'metadata';

        // Load video
        video.load();
        video.classList.add('loaded');

        // Handle video playback
        video.addEventListener('loadeddata', () => {
            if (!this.prefersReducedMotion) {
                const playPromise = video.play();
                if (playPromise !== undefined) {
                    playPromise.catch(() => {
                        // Handle autoplay restrictions gracefully
                        console.log('Video autoplay prevented by browser');
                    });
                }
            }
        }, { once: true });

        // Mark as loaded
        this.loadedVideos.add(video);
    }

    // Method to pause off-screen videos to save resources
    pauseOffScreenVideos() {
        const videos = document.querySelectorAll('video');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const video = entry.target;
                if (!entry.isIntersecting && !video.paused) {
                    video.pause();
                } else if (entry.isIntersecting && video.paused && !this.prefersReducedMotion) {
                    video.play().catch(() => { });
                }
            });
        }, { threshold: 0.1 });

        videos.forEach(video => observer.observe(video));
    }
}

// Initialize when DOM is ready
let videoLazyLoaderInstance;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        videoLazyLoaderInstance = new VideoLazyLoader();
        // Enable off-screen video pausing after 2 seconds
        setTimeout(() => {
            videoLazyLoaderInstance.pauseOffScreenVideos();
        }, 2000);
    });
} else {
    videoLazyLoaderInstance = new VideoLazyLoader();
    // Enable off-screen video pausing after 2 seconds
    setTimeout(() => {
        videoLazyLoaderInstance.pauseOffScreenVideos();
    }, 2000);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VideoLazyLoader;
}

