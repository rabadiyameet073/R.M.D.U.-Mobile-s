/**
 * Toast Notification System
 */

class ToastNotification {
    static show(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        // Remove existing toasts
        document.querySelectorAll('.toast').forEach(t => t.remove());

        document.body.appendChild(toast);

        // Trigger animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Remove after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    static success(message, duration = 3000) {
        this.show(message, 'success', duration);
    }

    static error(message, duration = 4000) {
        this.show(message, 'error', duration);
    }

    static info(message, duration = 3000) {
        this.show(message, 'info', duration);
    }

    static warning(message, duration = 3500) {
        this.show(message, 'warning', duration);
    }
}

// Global function for backward compatibility
function showToast(message, type = 'info') {
    ToastNotification.show(message, type);
}

// Make it available globally
window.ToastNotification = ToastNotification;
window.showToast = showToast;
