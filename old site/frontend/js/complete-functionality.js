(function () {
    'use strict';

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCompleteFunctionality);
    } else {
        initCompleteFunctionality();
    }

    function initCompleteFunctionality() {
        initNavigation();

        // 2. Initialize all forms
        initForms();

        initModals();

        // 4. Initialize all links
        initLinks();

        initLogout();

        // 6. Initialize session check
        checkUserSession();

        initInteractiveElements();
    }

    function initNavigation() {
        document.querySelectorAll('.logo, .nav-center img').forEach(logo => {
            if (!logo.hasAttribute('data-navigated')) {
                logo.style.cursor = 'pointer';
                logo.addEventListener('click', function () {
                    window.location.href = 'index.html';
                });
                logo.setAttribute('data-navigated', 'true');
            }
        });

        document.querySelectorAll('.home a, .home').forEach(home => {
            if (home.tagName === 'A') {
                home.href = 'index.html';
            } else {
                const link = home.querySelector('a');
                if (link) link.href = 'index.html';
            }
        });
    }

    function initForms() {
        document.querySelectorAll('form').forEach(form => {
            if (!form.hasAttribute('data-initialized')) {
                form.addEventListener('submit', function (e) {
                    // Let default handlers work, but ensure buttons are enabled
                    const submitBtn = this.querySelector('button[type="submit"]');
                    if (submitBtn && submitBtn.disabled) {
                        setTimeout(() => {
                            submitBtn.disabled = false;
                        }, 2000);
                    }
                });
                form.setAttribute('data-initialized', 'true');
            }
        });
    }

    function initModals() {
        document.querySelectorAll('.modal-close, .modal .close').forEach(closeBtn => {
            if (!closeBtn.hasAttribute('data-initialized')) {
                closeBtn.addEventListener('click', function () {
                    const modal = this.closest('.modal');
                    if (modal) {
                        modal.style.display = 'none';
                        document.body.style.overflow = '';
                    }
                });
                closeBtn.setAttribute('data-initialized', 'true');
            }
        });

        document.querySelectorAll('.modal').forEach(modal => {
            if (!modal.hasAttribute('data-initialized')) {
                modal.addEventListener('click', function (e) {
                    if (e.target === this) {
                        this.style.display = 'none';
                        document.body.style.overflow = '';
                    }
                });
                modal.setAttribute('data-initialized', 'true');
            }
        });

        // Close modal on Escape key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(modal => {
                    if (modal.style.display !== 'none') {
                        modal.style.display = 'none';
                        document.body.style.overflow = '';
                    }
                });
            }
        });
    }

    function initLinks() {
        document.querySelectorAll('a[href^="/"], a[href^="./"]').forEach(link => {
            if (!link.hasAttribute('data-initialized')) {
                link.addEventListener('click', function (e) {
                    // Let default behavior work, but ensure it's not broken
                    if (this.getAttribute('href') === '#' || this.getAttribute('href') === '') {
                        e.preventDefault();
                        if (window.showToast) {
                            window.showToast('Link not configured', 'warning');
                        }
                    }
                });
                link.setAttribute('data-initialized', 'true');
            }
        });
    }

    function initLogout() {
        window.handleLogout = function (e) {
            if (e) e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                fetch('backend/auth_api.php?action=logout', {
                    method: 'GET',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                })
                    .then(response => response.json())
                    .then(data => {
                        if (window.showToast) {
                            window.showToast('Logged out successfully', 'success');
                        } else {
                            alert('Logged out successfully');
                        }
                        setTimeout(() => {
                            window.location.href = 'index.html';
                        }, 1000);
                    })
                    .catch(error => {
                        console.error('Logout error:', error);
                        if (window.showToast) {
                            window.showToast('Logged out', 'info');
                        }
                        setTimeout(() => {
                            window.location.href = 'index.html';
                        }, 500);
                    });
            }
            return false;
        };

        document.querySelectorAll('.logout-btn, [onclick*="logout"], [onclick*="Logout"]').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                window.handleLogout();
            });
        });
    }

    function checkUserSession() {
        fetch('backend/session.php?action=check')
            .then(response => response.json())
            .then(data => {
                if (data.logged_in) {
                    const loginBtn = document.getElementById('loginBtnLi') || document.querySelector('.login-btn-li');
                    const logoutBtn = document.getElementById('logoutBtnLi') || document.querySelector('.logout-btn-li');

                    if (loginBtn) loginBtn.style.display = 'none';
                    if (logoutBtn) logoutBtn.style.display = 'block';

                    const userNameEl = document.querySelector('.user-name');
                    if (userNameEl && data.user_name) {
                        userNameEl.textContent = data.user_name;
                    }
                } else {
                    const loginBtn = document.getElementById('loginBtnLi') || document.querySelector('.login-btn-li');
                    const logoutBtn = document.getElementById('logoutBtnLi') || document.querySelector('.logout-btn-li');

                    if (loginBtn) loginBtn.style.display = 'block';
                    if (logoutBtn) logoutBtn.style.display = 'none';
                }
            })
            .catch(error => {
                console.log('Session check failed');
            });
    }

    function initInteractiveElements() {
        document.querySelectorAll('button:not([type="submit"]):not([type="reset"])').forEach(button => {
            if (!button.hasAttribute('data-initialized') && !button.onclick && !button.getAttribute('onclick')) {
                const href = button.getAttribute('data-href');
                if (href) {
                    button.addEventListener('click', function () {
                        window.location.href = href;
                    });
                    button.setAttribute('data-initialized', 'true');
                }
            }
        });

        document.querySelectorAll('.info-btn').forEach(btn => {
            if (!btn.hasAttribute('data-initialized')) {
                const onclick = btn.getAttribute('onclick');
                if (!onclick && btn.textContent.includes('info')) {
                    const card = btn.closest('.mobile-card');
                    if (card) {
                        const productName = card.querySelector('.mobile-title')?.textContent.trim();
                        if (productName && typeof openModal === 'function') {
                            btn.addEventListener('click', function () {
                                const modalId = productName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                                openModal(modalId);
                            });
                        }
                    }
                }
                btn.setAttribute('data-initialized', 'true');
            }
        });
    }

    function ensureAddToCartWorks() {
        if (typeof window.globalFunctionality === 'undefined') {
            // Wait for global-functionality to load
            setTimeout(ensureAddToCartWorks, 500);
        }
    }

    setInterval(checkUserSession, 30000);

    window.completeFunctionality = {
        checkSession: checkUserSession,
        logout: window.handleLogout
    };
})();

