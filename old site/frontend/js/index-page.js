// Index Page JavaScript

// Search functionality
document.getElementById('searchInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        const searchTerm = this.value.trim();
        if (searchTerm) {
            alert('Search feature coming soon! Looking for: ' + searchTerm);
        }
    }
});

// Button hover effects - Removed inline style manipulation for better performance
// Use CSS :hover pseudo-class instead


// Populate user session if logged-in
// Check if user is logged in and show/hide logout button
checkLoginStatus();

function checkLoginStatus() {
    fetch('backend/session.php?action=check')
        .then(response => response.json())
        .then(data => {
            if (data.logged_in) {
                // Show logout button, hide login button
                const loginBtn = document.querySelector('.login-btn-li');
                const logoutBtn = document.querySelector('.logout-btn-li');
                if (loginBtn) loginBtn.style.display = 'none';
                if (logoutBtn) logoutBtn.style.display = 'block';
            }
        })
        .catch(error => {});
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        fetch('backend/auth_api.php?action=logout', { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                alert('Logged out successfully');
                location.reload();
            })
            .catch(() => {
                location.reload();
            });
    }
}

// Category buttons functionality
document.querySelectorAll('.sidebar-menu a').forEach(link => {
    link.addEventListener('click', function (e) {
        // Let the default link behavior work
    });
});
