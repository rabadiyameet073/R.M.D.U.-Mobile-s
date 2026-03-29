document.addEventListener('DOMContentLoaded', () => {

    // --- Sidebar & Menu Toggle Logic ---
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarClose = document.getElementById('sidebarClose');

    // Function to close the sidebar
    function closeSidebar() {
        if (sidebar && sidebar.classList.contains('active')) {
            const scrollContainer = document.querySelector('.scroll-container');
            const currentScrollY = scrollContainer ? scrollContainer.scrollTop : window.scrollY;

            sidebar.classList.remove('active');
            if (menuToggle) {
                menuToggle.classList.remove('active');
                menuToggle.setAttribute('aria-expanded', 'false');
            }

            // Re-enable scroll-snap after sidebar closes
            setTimeout(() => {
                if (scrollContainer) {
                    scrollContainer.style.scrollSnapType = 'y mandatory';
                    scrollContainer.scrollTop = currentScrollY;
                }
            }, 700); // Match sidebar animation duration
        }
    }

    // Function to toggle the sidebar
    function toggleSidebar() {
        if (sidebar && menuToggle) {
            const scrollContainer = document.querySelector('.scroll-container');
            const wasActive = sidebar.classList.contains('active');

            if (!wasActive) {
                // Opening sidebar - save current scroll position
                const currentScrollY = scrollContainer ? scrollContainer.scrollTop : window.scrollY;

                // Disable scroll-snap temporarily
                if (scrollContainer) {
                    scrollContainer.style.scrollSnapType = 'none';
                }

                sidebar.classList.add('active');
                menuToggle.classList.add('active');
                menuToggle.setAttribute('aria-expanded', 'true');

                // Restore scroll position after sidebar animation
                setTimeout(() => {
                    if (scrollContainer) {
                        scrollContainer.scrollTop = currentScrollY;
                    } else {
                        window.scrollTo(0, currentScrollY);
                    }
                }, 50);
            } else {
                // Closing sidebar
                closeSidebar();
            }
        }
    }

    if (menuToggle && sidebar) {
        // Menu toggle click
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSidebar();
        });

        // Close button click
        if (sidebarClose) {
            sidebarClose.addEventListener('click', (e) => {
                e.stopPropagation();
                closeSidebar();
            });
        }

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (
                sidebar.classList.contains('active') &&
                !sidebar.contains(e.target) &&
                !menuToggle.contains(e.target)
            ) {
                closeSidebar();
            }
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeSidebar();
            }
        });

        sidebar.addEventListener('click', e => e.stopPropagation());
    }

    // --- Custom Cursor Logic - GPU Optimized with RAF ---
    const cursor = document.querySelector('.custom-cursor');
    const hoverElements = document.querySelectorAll('a, button, .menu-toggle');

    if (cursor) {
        let cursorX = 0;
        let cursorY = 0;
        let requestId = null;

        // Batch cursor position updates using RAF for 60fps smooth rendering
        function updateCursorPosition() {
            cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
            requestId = null;
        }

        // Use passive listener for better scroll performance
        window.addEventListener('mousemove', (e) => {
            cursorX = e.clientX;
            cursorY = e.clientY;

            // Only request one animation frame at a time
            if (requestId === null) {
                requestId = requestAnimationFrame(updateCursorPosition);
            }
        }, { passive: true });

        // Cache hover state changes
        hoverElements.forEach(el => {
            el.addEventListener('mouseenter', () => cursor.classList.add('hover'), { passive: true });
            el.addEventListener('mouseleave', () => cursor.classList.remove('hover'), { passive: true });
        });
    }

    // --- Expanding Search Bar Logic ---
    const searchContainer = document.getElementById('searchContainer');
    const searchButton = document.getElementById('searchButton');
    const searchInput = document.getElementById('searchInput');

    if (searchContainer && searchButton && searchInput) {
        searchButton.addEventListener('click', (event) => {
            event.stopPropagation();
            searchContainer.classList.toggle('active');
            if (searchContainer.classList.contains('active')) {
                searchInput.focus();
            }
        });

        document.addEventListener('click', (event) => {
            const isClickInside = searchContainer.contains(event.target);
            if (!isClickInside && searchContainer.classList.contains('active')) {
                searchContainer.classList.remove('active');
            }
        });
    }

    // --- Login Form Validation Logic ---
    // Note: This assumes you have a login form with id="loginForm" on another page.
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', function (event) {
            event.preventDefault(); // Prevent the form from submitting by default
            clearErrors(); // Clear previous errors

            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();
            let isValid = true;

            // Validate Email
            if (email === '') {
                showError('emailError', 'Email address is required.');
                isValid = false;
            } else if (!isValidEmail(email)) {
                showError('emailError', 'Please enter a valid email address.');
                isValid = false;
            }

            // Validate Password
            if (password === '') {
                showError('passwordError', 'Password is required.');
                isValid = false;
            } else if (password.length < 8) {
                showError('passwordError', 'Password must be at least 8 characters long.');
                isValid = false;
            }

            // If everything is valid, proceed
            if (isValid) {
                storeSession(email);
                window.location.href = "index.html"; // Redirect after successful login
            }
        });
    }

    // --- Search Functionality (Enter key to search) ---
    if (searchInput) {
        searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                const searchTerm = this.value.trim();
                if (searchTerm) {
                    alert('Search feature coming soon! Looking for: ' + searchTerm);
                    // TODO: Implement AJAX search to backend PHP
                }
            }
        });
    }

    // --- Button Hover Effects ---
    // Note: Hover effects now handled entirely in CSS for better performance
    // Removed inline style manipulation to eliminate layout thrashing

    // --- Sidebar Menu Click Logging ---
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.addEventListener('click', function (e) {
            // Let the default link behavior work
        });
    });
});

// --- Helper Functions for Validation ---

/**
 * Displays an error message for a specific form field.
 * @param {string} elementId - The ID of the div where the error message will be shown.
 * @param {string} message - The error message to display.
 */
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) errorElement.textContent = message;
}

/**
 * Clears all previous error messages from the form.
 */
function clearErrors() {
    const errorMessages = document.querySelectorAll('.error-message');
    errorMessages.forEach((element) => {
        element.textContent = '';
    });
}

/**
 * Checks if an email string has a valid format.
 * @param {string} email - The email address to validate.
 * @returns {boolean} - True if the email is valid, false otherwise.
 */
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// --- Session Management Functions ---

/**
 * Stores the user's email in sessionStorage and shows a confirmation alert.
 * @param {string} userEmail - The email of the logged-in user.
 */
function storeSession(userEmail) {
    sessionStorage.setItem("username", userEmail);
    alert("Login successful! Welcome, " + userEmail);
}

/**
 * Greets the user if they are logged in, or prompts them to log in.
 */
function greetUser() {
    let user = sessionStorage.getItem("username");
    if (user) {
        alert("Welcome back, " + user + "!");
    } else {
        alert("Please login first.");
    }
}