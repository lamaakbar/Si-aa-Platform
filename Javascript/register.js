// register.js - Complete Registration Page Handler

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

function isFilled(input, msg) {
    clearError(input);
    const value = input.value.trim();

    if (value.length < 1) {
        showError(input, msg);
        return false;
    }
    return true;
}

function isEmail(input) {
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

function isMobile(input) {
    clearError(input);
    const value = input.value.trim();

    if (!value) {
        showError(input, 'Phone number is required.');
        return false;
    }

    if (!value.match(/^5[0-9]{8}$/)) {
        showError(input, 'Phone number must be 9 digits starting with 5 (e.g. 501234567).');
        return false;
    }

    return true;
}

function isPasswordValid(passInput, confirmInput) {
    clearError(passInput);
    clearError(confirmInput);

    const pass = passInput.value.trim();
    const confirm = confirmInput.value.trim();

    let isValid = true;

    if (!pass) {
        showError(passInput, 'Password is required.');
        isValid = false;
    } else if (pass.length < 8) {
        showError(passInput, 'Password must be at least 8 characters.');
        isValid = false;
    }

    if (!confirm) {
        showError(confirmInput, 'Please confirm your password.');
        isValid = false;
    } else if (pass !== confirm) {
        showError(confirmInput, 'Passwords do not match.');
        isValid = false;
    }

    return isValid;
}

function isAgeValid(dobInput) {
    clearError(dobInput);

    const dobValue = dobInput.value.trim();
    if (!dobValue) {
        showError(dobInput, 'Date of birth is required.');
        return false;
    }

    const dob = new Date(dobValue);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();

    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        showError(dobInput, 'Please enter a valid date of birth.');
        return false;
    }

    if (age < 18) {
        showError(dobInput, 'You must be at least 18 years old.');
        return false;
    }

    return true;
}


function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
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
        alert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Auto-remove after delay
    setTimeout(() => {
        alert.remove();
    }, type === 'error' ? 6000 : 3000);
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

// Toggle functionality
function setupToggleButtons() {
    const toggleButtons = document.querySelectorAll('.auth-toggle-btn');
    const accountTypeInput = document.getElementById('accountType');

    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            toggleButtons.forEach(btn => btn.classList.remove('active'));

            // Add active class to clicked button
            button.classList.add('active');

            // Update hidden input value
            const userType = button.getAttribute('data-type');
            accountTypeInput.value = userType;

            // Update form subtitle
            updateFormTitle(userType);
        });
    });
}

function updateFormTitle(userType) {
    const subtitle = document.querySelector('.auth-subtitle');
    if (subtitle) {
        if (userType === 'seeker') {
            subtitle.textContent = 'Create your account to find storage spaces.';
        } else {
            subtitle.textContent = 'Create your account to list your spaces.';
        }
    }
}

// API functions
async function handleRegister(e) {
    e.preventDefault();

    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const accountTypeInput = document.getElementById('accountType');
    const termsCheckbox = document.querySelector('input[name="terms"]');
    const submitButton = document.querySelector('.auth-submit');

    // New inputs
    const dateOfBirthInput = document.getElementById('dateOfBirth');
    const genderInputs = document.querySelectorAll('input[name="gender"]');
    const nationalIdInput = document.getElementById('nationalId');
    const companyNameInput = document.getElementById('companyName');
    const profilePictureInput = document.getElementById('profilePicture');
    const contentTypeInput = document.getElementById('contentType');

    // Validate core fields
    let isValid = true;

    if (!isFilled(fullNameInput, 'Full name is required.')) isValid = false;
    if (!isEmail(emailInput)) isValid = false;
    if (!isMobile(phoneInput)) isValid = false;
    if (!isPasswordValid(passwordInput, confirmPasswordInput)) isValid = false;
    if (!isAgeValid(dateOfBirthInput)) isValid = false;

    // Check terms
    const termsGroup = termsCheckbox.closest('.form-group');
    const oldTermsError = termsGroup ? termsGroup.querySelector('.error-msg') : null;
    if (oldTermsError) oldTermsError.remove();

    if (!termsCheckbox.checked) {
        const termsError = document.createElement('p');
        termsError.classList.add('error-msg');
        termsError.textContent = 'You must agree to the Terms & Privacy Policy.';
        if (termsGroup) termsGroup.appendChild(termsError);
        isValid = false;
    }

    if (!isValid) {
        return;
    }

    // Extract name parts
    const fullName = fullNameInput.value.trim();
    const nameParts = fullName.split(' ').filter(Boolean);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || firstName;

    // Get gender value
    let gender = 'Other';
    genderInputs.forEach(g => { if (g.checked) gender = g.value; });

    // Read profile picture (optional)
    let profilePictureDataURL = null;
    let profilePictureType = null;

    if (profilePictureInput && profilePictureInput.files && profilePictureInput.files[0]) {
        const file = profilePictureInput.files[0];
        profilePictureType = file.type || 'image/png'; // fallback to PNG

        try {
            profilePictureDataURL = await readFileAsDataURL(file);
        } catch (err) {
            console.warn('Failed to read profile picture:', err);
            profilePictureDataURL = null;
            profilePictureType = null;
        }
    }


    // Prepare payload fields
    const payload = {
        fullName,
        email: emailInput.value.trim(),
        phone: '+966' + phoneInput.value.trim().replace(/\D/g, ''), // ensure digits only and prefix
        password: passwordInput.value,
        accountType: accountTypeInput.value,

        // New DB-aligned fields
        FirstName: firstName,
        LastName: lastName,
        DateOfBirth: dateOfBirthInput ? dateOfBirthInput.value || null : null,
        Gender: gender || null,
        NationalID: nationalIdInput ? nationalIdInput.value.trim() || null : null,
        CompanyName: companyNameInput ? companyNameInput.value.trim() || null : null,
        ContentType: profilePictureType ? profilePictureType.value || null : null,
        ProfilePicture: profilePictureDataURL, // data URL (e.g. "data:image/jpeg;base64,...") or null

        // Hidden/defaults
        IsVerified: document.getElementById('isVerified') ? Number(document.getElementById('isVerified').value) : 0,
        VerificationDate: document.getElementById('verificationDate') ? document.getElementById('verificationDate').value || null : null,
        AccountStatus: document.getElementById('accountStatus') ? document.getElementById('accountStatus').value : 'Active'
    };

    // Disable button and show loading
    submitButton.disabled = true;
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Creating Account...';

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }

        // Store user data and token
        localStorage.setItem('siaaUser', JSON.stringify(data.user));
        localStorage.setItem('siaaToken', data.token);

        // Show success message
        showAlert('Account created successfully! Redirecting...', 'success');

        // Redirect to dashboard after short delay
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);

    } catch (error) {
        console.error('Registration error:', error);

        let errorMessage = 'Registration failed. Please try again.';

        if (error.message.includes('Email')) {
            errorMessage = 'This email is already registered. Please login instead.';
        } else if (error.message.includes('National ID')) {
            errorMessage = 'This National ID is already registered. Please check your details.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        

        showAlert(errorMessage, 'error');

        // Re-enable button
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    // Check if already logged in
    const userData = localStorage.getItem('siaaUser');
    if (userData) {
        window.location.href = 'dashboard.html';
        return;
    }
    // Setup toggle buttons
    setupToggleButtons();

    // Setup form submission
    const form = document.querySelector('.auth-form');
    if (form) {
        form.addEventListener('submit', handleRegister);
    }

    // Real-time validation on blur
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    if (fullNameInput) {
        fullNameInput.addEventListener('blur', () => {
            isFilled(fullNameInput, 'Full name is required.');
        });
    }

    if (emailInput) {
        emailInput.addEventListener('blur', () => {
            isEmail(emailInput);
        });
    }

    if (phoneInput) {
        phoneInput.addEventListener('blur', () => {
            isMobile(phoneInput);
        });
    }

    if (passwordInput && confirmPasswordInput) {
        passwordInput.addEventListener('blur', () => {
            if (passwordInput.value.trim()) {
                isPasswordValid(passwordInput, confirmPasswordInput);
            }
        });

        confirmPasswordInput.addEventListener('blur', () => {
            if (confirmPasswordInput.value.trim()) {
                isPasswordValid(passwordInput, confirmPasswordInput);
            }
        });
    }
    
    if (dateOfBirthInput) {
        dateOfBirthInput.addEventListener('blur', () => {
            isAgeValid(dateOfBirthInput);
        });
    }
});
