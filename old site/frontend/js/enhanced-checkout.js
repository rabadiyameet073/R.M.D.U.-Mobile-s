/**
 * ============================================
 * RMDU Mobiles - Enhanced Checkout UX
 * Streamlined checkout with advanced features
 * ============================================
 */

class EnhancedCheckout {
    constructor() {
        this.form = document.getElementById('checkoutForm');
        this.currentStep = 1;
        this.totalSteps = 3;
        this.userData = this.loadSavedData();
        
        this.init();
    }

    init() {
        this.setupFormValidation();
        this.setupAutoFill();
        this.setupProgressIndicator();
        this.setupRealTimeValidation();
        this.setupFormNavigation();
        this.loadSavedAddresses();
        this.setupPincodeValidator();
    }

    // Setup form validation with visual feedback
    setupFormValidation() {
        const inputs = this.form.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            // Add validation classes on blur
            input.addEventListener('blur', (e) => {
                this.validateField(e.target);
            });

            // Remove error state on input
            input.addEventListener('input', (e) => {
                if (e.target.classList.contains('error')) {
                    this.clearFieldError(e.target);
                }
            });
        });
    }

    // Validate individual field
    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        // Required field check
        if (field.hasAttribute('required') && !value) {
            isValid = false;
            errorMessage = 'This field is required';
        }

        // Email validation
        if (field.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid email address';
            }
        }

        // Phone validation
        if (field.type === 'tel' && value) {
            const phoneRegex = /^[0-9]{10}$/;
            if (!phoneRegex.test(value.replace(/[\s-]/g, ''))) {
                isValid = false;
                errorMessage = 'Please enter a valid 10-digit phone number';
            }
        }

        // Pincode validation
        if (field.name === 'pincode' && value) {
            const pincodeRegex = /^[0-9]{6}$/;
            if (!pincodeRegex.test(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid 6-digit pincode';
            } else {
                // Auto-fill city/state based on pincode
                this.fetchLocationFromPincode(value);
            }
        }

        // Update UI based on validation
        if (!isValid) {
            this.showFieldError(field, errorMessage);
        } else {
            this.showFieldSuccess(field);
        }

        return isValid;
    }

    // Show field error
    showFieldError(field, message) {
        field.classList.add('error');
        field.classList.remove('success');
        
        // Remove existing error message
        const existingError = field.parentElement.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        // Add error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        field.parentElement.appendChild(errorDiv);
    }

    // Show field success
    showFieldSuccess(field) {
        field.classList.add('success');
        field.classList.remove('error');
        
        const existingError = field.parentElement.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
    }

    // Clear field error
    clearFieldError(field) {
        field.classList.remove('error');
        const existingError = field.parentElement.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
    }

    // Real-time validation for better UX
    setupRealTimeValidation() {
        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                if (value.length > 10) value = value.slice(0, 10);
                e.target.value = value;
            });
        }

        const pincodeInput = document.getElementById('pincode');
        if (pincodeInput) {
            pincodeInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                if (value.length > 6) value = value.slice(0, 6);
                e.target.value = value;
            });
        }
    }

    // Setup auto-fill from saved data or browser
    setupAutoFill() {
        // Check if user has saved data
        if (this.userData && Object.keys(this.userData).length > 0) {
            // Auto-fill from saved data
            Object.keys(this.userData).forEach(key => {
                const field = this.form.querySelector(`[name="${key}"]`);
                if (field && !field.value) {
                    field.value = this.userData[key];
                    if (field.type !== 'password') {
                        this.showFieldSuccess(field);
                    }
                }
            });
        }

        // Enable browser autofill
        const nameField = document.getElementById('name');
        const emailField = document.getElementById('email');
        const phoneField = document.getElementById('phone');

        if (nameField) nameField.setAttribute('autocomplete', 'name');
        if (emailField) emailField.setAttribute('autocomplete', 'email');
        if (phoneField) phoneField.setAttribute('autocomplete', 'tel');
    }

    // Setup progress indicator
    setupProgressIndicator() {
        const progressHTML = `
            <div class="checkout-progress">
                <div class="progress-steps">
                    <div class="progress-step ${this.currentStep >= 1 ? 'active' : ''}" data-step="1">
                        <div class="step-number">1</div>
                        <div class="step-label">Customer Info</div>
                    </div>
                    <div class="progress-line ${this.currentStep >= 2 ? 'active' : ''}"></div>
                    <div class="progress-step ${this.currentStep >= 2 ? 'active' : ''}" data-step="2">
                        <div class="step-number">2</div>
                        <div class="step-label">Shipping</div>
                    </div>
                    <div class="progress-line ${this.currentStep >= 3 ? 'active' : ''}"></div>
                    <div class="progress-step ${this.currentStep >= 3 ? 'active' : ''}" data-step="3">
                        <div class="step-number">3</div>
                        <div class="step-label">Payment</div>
                    </div>
                </div>
            </div>
        `;

        const form = document.getElementById('checkoutForm');
        if (form && !document.querySelector('.checkout-progress')) {
            form.insertAdjacentHTML('beforebegin', progressHTML);
        }

        // Update progress on form sections scroll
        this.observeFormSections();
    }

    // Observe form sections to update progress
    observeFormSections() {
        const sections = this.form.querySelectorAll('.form-section');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const sectionIndex = Array.from(sections).indexOf(entry.target);
                    this.updateProgress(sectionIndex + 1);
                }
            });
        }, { threshold: 0.5 });

        sections.forEach(section => observer.observe(section));
    }

    // Update progress indicator
    updateProgress(step) {
        this.currentStep = step;
        const steps = document.querySelectorAll('.progress-step');
        const lines = document.querySelectorAll('.progress-line');

        steps.forEach((stepEl, index) => {
            if (index + 1 <= step) {
                stepEl.classList.add('active');
                stepEl.classList.add('completed');
            } else {
                stepEl.classList.remove('active', 'completed');
            }
        });

        lines.forEach((lineEl, index) => {
            if (index + 1 < step) {
                lineEl.classList.add('active');
            } else {
                lineEl.classList.remove('active');
            }
        });
    }

    // Setup form navigation (scroll to section on click)
    setupFormNavigation() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.progress-step')) {
                const step = parseInt(e.target.closest('.progress-step').dataset.step);
                const sections = this.form.querySelectorAll('.form-section');
                if (sections[step - 1]) {
                    sections[step - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    }

    // Pincode validator with city/state auto-fill
    setupPincodeValidator() {
        const pincodeInput = document.getElementById('pincode');
        if (!pincodeInput) return;

        let timeout;
        pincodeInput.addEventListener('input', (e) => {
            clearTimeout(timeout);
            const pincode = e.target.value.trim();
            
            if (pincode.length === 6 && /^[0-9]{6}$/.test(pincode)) {
                timeout = setTimeout(() => {
                    this.fetchLocationFromPincode(pincode);
                }, 500);
            }
        });
    }

    // Fetch location data from pincode (using a public API)
    async fetchLocationFromPincode(pincode) {
        const cityField = document.getElementById('city');
        const stateField = document.getElementById('state');

        if (!cityField || !stateField) return;

        // Show loading state
        cityField.value = 'Loading...';
        stateField.value = 'Loading...';
        cityField.disabled = true;
        stateField.disabled = true;

        try {
            // Using postalpincode.in API (free tier)
            const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
            const data = await response.json();

            if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
                const postOffice = data[0].PostOffice[0];
                cityField.value = postOffice.District || postOffice.Name || '';
                stateField.value = postOffice.State || '';
                
                this.showFieldSuccess(cityField);
                this.showFieldSuccess(stateField);
            } else {
                // If API fails, allow manual entry
                cityField.value = '';
                stateField.value = '';
            }
        } catch (error) {
            console.error('Error fetching location:', error);
            // Allow manual entry on error
            cityField.value = '';
            stateField.value = '';
        } finally {
            cityField.disabled = false;
            stateField.disabled = false;
        }
    }

    // Load saved addresses (if user is logged in)
    loadSavedAddresses() {
        const savedAddresses = localStorage.getItem('savedAddresses');
        if (!savedAddresses) return;

        try {
            const addresses = JSON.parse(savedAddresses);
            if (addresses.length > 0) {
                this.displaySavedAddresses(addresses);
            }
        } catch (error) {
            console.error('Error loading saved addresses:', error);
        }
    }

    // Display saved addresses dropdown
    displaySavedAddresses(addresses) {
        const addressSection = document.querySelector('.form-section:nth-child(2)');
        if (!addressSection) return;

        const savedAddressHTML = `
            <div class="saved-addresses">
                <label>Saved Addresses</label>
                <select id="savedAddressSelect" class="saved-address-select">
                    <option value="">Select a saved address or enter new</option>
                    ${addresses.map((addr, index) => `
                        <option value="${index}">${addr.name} - ${addr.address.substring(0, 40)}...</option>
                    `).join('')}
                </select>
            </div>
        `;

        const addressGroup = addressSection.querySelector('.form-group:first-child');
        if (addressGroup && !document.getElementById('savedAddressSelect')) {
            addressSection.insertAdjacentHTML('afterbegin', savedAddressHTML);

            // Handle saved address selection
            const select = document.getElementById('savedAddressSelect');
            select.addEventListener('change', (e) => {
                if (e.target.value !== '') {
                    const address = addresses[parseInt(e.target.value)];
                    this.fillAddressFields(address);
                }
            });
        }
    }

    // Fill address fields from saved address
    fillAddressFields(address) {
        document.getElementById('address').value = address.address || '';
        document.getElementById('city').value = address.city || '';
        document.getElementById('state').value = address.state || '';
        document.getElementById('pincode').value = address.pincode || '';
    }

    // Save form data to localStorage
    saveFormData() {
        const formData = new FormData(this.form);
        const data = {};
        
        formData.forEach((value, key) => {
            if (key !== 'payment_method') { // Don't save payment method
                data[key] = value;
            }
        });

        localStorage.setItem('checkoutFormData', JSON.stringify(data));
    }

    // Load saved form data
    loadSavedData() {
        try {
            const saved = localStorage.getItem('checkoutFormData');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            return {};
        }
    }

    // Validate entire form
    validateForm() {
        const inputs = this.form.querySelectorAll('input[required], textarea[required], select[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
                // Scroll to first error
                if (isValid === false) {
                    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    isValid = null; // Prevent multiple scrolls
                }
            }
        });

        return isValid;
    }

    // Save address to localStorage
    saveAddress() {
        const address = {
            name: document.getElementById('name').value,
            address: document.getElementById('address').value,
            city: document.getElementById('city').value,
            state: document.getElementById('state').value,
            pincode: document.getElementById('pincode').value,
            phone: document.getElementById('phone').value
        };

        try {
            const savedAddresses = JSON.parse(localStorage.getItem('savedAddresses') || '[]');
            savedAddresses.push(address);
            localStorage.setItem('savedAddresses', JSON.stringify(savedAddresses));
        } catch (error) {
            console.error('Error saving address:', error);
        }
    }
}

// Enhanced form submission
document.addEventListener('DOMContentLoaded', function() {
    const enhancedCheckout = new EnhancedCheckout();
    
    // Save form data on input
    const form = document.getElementById('checkoutForm');
    if (form) {
        form.addEventListener('input', () => {
            enhancedCheckout.saveFormData();
        });

        // Enhanced form submission
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            // Validate form
            if (!enhancedCheckout.validateForm()) {
                // Show error toast
                showToast('Please fix the errors before submitting', 'error');
                return;
            }

            const formData = new FormData(this);
            const submitBtn = this.querySelector('button[type="submit"]');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnIcon = submitBtn.querySelector('.btn-icon');

            // Disable submit button
            submitBtn.disabled = true;
            btnIcon.textContent = '⏳';
            btnText.textContent = 'Processing Order...';

            // Show loading overlay
            showLoadingOverlay();

            fetch('backend/checkout/process_checkout.php', {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    hideLoadingOverlay();
                    
                    if (data.success) {
                        btnIcon.textContent = '✅';
                        btnText.textContent = 'Order Placed!';

                        // Show success toast
                        showToast(data.message || 'Order placed successfully!', 'success');

                        // Save address if checkbox is checked
                        const saveAddressCheck = document.getElementById('saveAddress');
                        if (saveAddressCheck && saveAddressCheck.checked) {
                            enhancedCheckout.saveAddress();
                        }

                        // Redirect after delay
                        setTimeout(() => {
                            if (data.data && data.data.redirect) {
                                window.location.href = data.data.redirect;
                            } else {
                                window.location.href = 'index.html';
                            }
                        }, 1500);
                    } else {
                        showToast(data.message || 'Failed to place order. Please try again.', 'error');
                        submitBtn.disabled = false;
                        btnIcon.textContent = '🔒';
                        btnText.textContent = 'Place Order Securely';
                    }
                })
                .catch(error => {
                    hideLoadingOverlay();
                    console.error('Error:', error);
                    showToast('An error occurred. Please try again.', 'error');
                    submitBtn.disabled = false;
                    btnIcon.textContent = '🔒';
                    btnText.textContent = 'Place Order Securely';
                });
        });
    }
});

// Toast notification function
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Loading overlay
function showLoadingOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'checkoutLoadingOverlay';
    overlay.className = 'checkout-loading-overlay';
    overlay.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Processing your order...</p>
        </div>
    `;
    document.body.appendChild(overlay);
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('checkoutLoadingOverlay');
    if (overlay) {
        overlay.remove();
    }
}

