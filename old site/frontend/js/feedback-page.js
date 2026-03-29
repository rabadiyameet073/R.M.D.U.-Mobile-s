// Feedback Page JavaScript

// Character counter for textarea
const commentsTextarea = document.getElementById('comments');
const charCount = document.getElementById('charCount');

if (commentsTextarea && charCount) {
    commentsTextarea.addEventListener('input', function () {
        const length = this.value.length;
        charCount.textContent = length;

        if (length > 500) {
            this.value = this.value.substring(0, 500);
            charCount.textContent = 500;
        }
    });
}

// Star rating feedback
const starInputs = document.querySelectorAll('.star-rating input[name="rating"]');
const ratingText = document.getElementById('ratingText');

if (starInputs && ratingText) {
    starInputs.forEach(input => {
        input.addEventListener('change', function () {
            const value = this.value;
            const ratings = {
                '5': '⭐ Excellent! We\'re thrilled!',
                '4': '⭐ Good! Thanks for the feedback!',
                '3': '⭐ Average. We\'ll work on improving!',
                '2': '⭐ Poor. We\'re sorry to hear that!',
                '1': '⭐ Very Poor. Let us make it right!'
            };
            ratingText.textContent = ratings[value] || '';
            ratingText.style.color = value >= 4 ? '#4ede9a' : value == 3 ? '#fbbf24' : '#ef4444';
        });
    });
}

// Emoji rating hover effects
const emojiLabels = document.querySelectorAll('.emoji-rating label');
emojiLabels.forEach(label => {
    label.addEventListener('mouseenter', function () {
        this.style.transform = 'scale(1.3)';
    });
    label.addEventListener('mouseleave', function () {
        this.style.transform = 'scale(1)';
    });
});

// Form submission
function submitFeedback() {
    const form = document.getElementById('feedbackForm');
    const submitBtn = form.querySelector('button[type="submit"]');
    const btnIcon = submitBtn.querySelector('.btn-icon');
    const formContainer = form.parentElement;
    const successMessage = document.getElementById('successMessage');

    // Disable button
    submitBtn.disabled = true;
    btnIcon.textContent = '⏳';
    submitBtn.querySelector('span:last-child').textContent = 'Submitting...';

    // Get form data
    const formData = new FormData(form);

    // Submit to backend
    fetch('backend/feedback/submit.php', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Hide form
                form.style.display = 'none';

                // Show success message
                successMessage.style.display = 'block';
                successMessage.style.animation = 'fadeInScale 0.5s ease-out';

                // Show toast notification
                if (window.showToast) {
                    window.showToast(data.message || 'Feedback submitted successfully!', 'success');
                }

                // Confetti effect (optional)
                createConfetti();

                // Reset form after 3 seconds
                setTimeout(() => {
                    form.reset();
                    form.style.display = 'block';
                    successMessage.style.display = 'none';
                    submitBtn.disabled = false;
                    btnIcon.textContent = '📤';
                    submitBtn.querySelector('span:last-child').textContent = 'Submit Feedback';
                    if (ratingText) ratingText.textContent = '';
                    if (charCount) charCount.textContent = '0';
                }, 3000);
            } else {
                // Show error
                if (window.showToast) {
                    window.showToast(data.message || 'Failed to submit feedback', 'error');
                } else {
                    alert(data.message || 'Failed to submit feedback');
                }
                submitBtn.disabled = false;
                btnIcon.textContent = '📤';
                submitBtn.querySelector('span:last-child').textContent = 'Submit Feedback';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            if (window.showToast) {
                window.showToast('An error occurred. Please try again.', 'error');
            } else {
                alert('An error occurred. Please try again.');
            }
            submitBtn.disabled = false;
            btnIcon.textContent = '📤';
            submitBtn.querySelector('span:last-child').textContent = 'Submit Feedback';
        });
}

// Simple confetti effect
function createConfetti() {
    const container = document.querySelector('.feedback-container');
    const colors = ['#FFD700', '#4ede9a', '#8b5cf6', '#ef4444', '#3b82f6'];

    for (let i = 0; i < 30; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * window.innerWidth + 'px';
        confetti.style.top = '-10px';
        confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
        confetti.style.pointerEvents = 'none';
        confetti.style.zIndex = '10000';

        document.body.appendChild(confetti);

        const duration = Math.random() * 2 + 1;
        const rotation = Math.random() * 360;

        confetti.animate([
            {
                transform: `translateY(0) rotate(0deg)`,
                opacity: 1
            },
            {
                transform: `translateY(${window.innerHeight}px) rotate(${rotation}deg)`,
                opacity: 0
            }
        ], {
            duration: duration * 1000,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        });

        setTimeout(() => confetti.remove(), duration * 1000);
    }
}
