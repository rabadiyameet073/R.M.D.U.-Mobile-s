function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.getElementById('toggleIcon');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
        document.getElementById('email').value = savedEmail;
        document.getElementById('rememberMe').checked = true;
    }
});

document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const submitBtn = this.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnIcon = submitBtn.querySelector('.btn-icon');
    const rememberMe = document.getElementById('rememberMe').checked;
    const email = document.getElementById('email').value;

    submitBtn.disabled = true;
    btnIcon.textContent = '⏳';
    btnText.textContent = 'Logging in...';

    if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
    } else {
        localStorage.removeItem('rememberedEmail');
    }

    fetch('backend/auth/login.php', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                btnIcon.textContent = '✅';
                btnText.textContent = 'Success!';

                setTimeout(() => {
                    alert(data.message);
                    window.location.href = 'index.html';
                }, 500);
            } else {
                alert(data.message);
                submitBtn.disabled = false;
                btnIcon.textContent = '🔓';
                btnText.textContent = 'Log In';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
            submitBtn.disabled = false;
            btnIcon.textContent = '🔓';
            btnText.textContent = 'Log In';
        });
});

document.querySelectorAll('.social-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        const provider = this.classList.contains('google-btn') ? 'Google' : 'Apple';
        alert(`${provider} login is coming soon!`);
    });
});

