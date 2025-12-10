// login.js - Complete Login Page Handler

const API_BASE_URL = 'http://localhost:3000/api';

// Validation functions
function showError(input, msg) {
    const group = input.closest('.form-group');
    if (!group) return;

    clearError(input);
    input.classList.add('error');

    const p = document.createElement('p');
    p.classList.add('error-msg');
    p.textContent = msg;
    group.appendChild(p);
}

function clearError(input) {
    if (!input) return;
    
    const group = input.closest('.form-group');
    if (!group) return;

    input.classList.remove('error');
    const msg = group.querySelector('.error-msg');
    if (msg) msg.remove();
}

function isEmail(input) {
    if (!input) return false;

    clearError(input);
    const value = input.value.trim();
    const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!value) {
        showError(input, 'Email is required.');
        return false;
    }

    if (!pattern.test(value)) {
        showError(input, 'Please enter a valid email address.');
        return false;
    }

    return true;
}

function isPassword(input) {
    if (!input) return false;

    clearError(input);
    const value = input.value.trim();

    if (!value) {
        showError(input, 'Password is required.');
        return false;
    }

    if (value.length < 8) {
        showError(input, 'Password must be at least 8 characters.');
        return false;
    }

    return true;
}

function showAlert(message, type = 'error') {
    // Remove existing alerts
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }

    // Create alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    
    const icon = type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle';
    alert.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${escapeHtml(message)}</span>
    `;

    // Insert before form
    const form = document.querySelector('.auth-form');
    if (form) {
        form.parentNode.insertBefore(alert, form);
    }

    // Auto-remove after delay
    setTimeout(() => {
        alert.remove();
    }, type === 'error' ? 5000 : 3000);
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// API functions
async function handleLogin(e) {
    e.preventDefault();

    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const submitButton = document.querySelector('.auth-submit');

    // Validate inputs
    let isValid = true;
    if (!isEmail(emailInput)) isValid = false;
    if (!isPassword(passwordInput)) isValid = false;

    if (!isValid) {
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Disable button and show loading
    submitButton.disabled = true;
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Logging in...';

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        // Store user data and token
        localStorage.setItem('siaaUser', JSON.stringify(data.user));
        localStorage.setItem('siaaToken', data.token);

        // Show success message
        showAlert('Login successful! Redirecting...', 'success');

        // Redirect to dashboard after short delay
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);

    } catch (error) {
        console.error('Login error:', error);
        showAlert(error.message || 'Login failed. Please try again.', 'error');
        
        // Re-enable button
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if already logged in
    const userData = localStorage.getItem('siaaUser');
    if (userData) {
        window.location.href = 'dashboard.html';
        return;
    }

    const form = document.querySelector('auth-form-login');
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');

    if (!form) return;

    // Real-time validation on blur
    if (emailInput) {
        emailInput.addEventListener('blur', function() {
            isEmail(emailInput);
        });
    }

    if (passwordInput) {
        passwordInput.addEventListener('blur', function() {
            isPassword(passwordInput);
        });
    }

    // Form submission
    form.addEventListener('submit', handleLogin);
});