/**
 * Login Form Handler
 * Handles login form validation and submission
 */

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        initializeLoginForm();
    });

    function initializeLoginForm() {
        const form = document.querySelector('.auth-form');
        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');

        if (!form) return;

        // Email validation on blur (real-time feedback)
        if (emailInput) {
            emailInput.addEventListener('blur', function() {
                isEmail(emailInput);
            });
        }

        // Password validation on blur (real-time feedback)
        if (passwordInput) {
            passwordInput.addEventListener('blur', function() {
                isPassword(passwordInput);
            });
        }

        // Form submission
        form.addEventListener('submit', function(e) {
            let isValid = true;

            if (!isEmail(emailInput)) isValid = false;
            if (!isPassword(passwordInput)) isValid = false;

            if (!isValid) {
                e.preventDefault();
                return;
            }

            // Form is valid - proceed with login
            // In production, this would send to your authentication API
            console.log('Login form is valid. Processing login...');
            
            // Example: Send to server
            // fetch('/api/login', {
            //  and so on
            
            // For demo:
            // alert('Login successful! (This is a demo)');
            // window.location.href = 'index.html';
        });
    }

    /**
     * Email Validation
     * Uses comprehensive email regex pattern
     */
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

    /**
     * Password Validation
     * Requires minimum 8 characters for security
     */
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

    /**
     * Show Error Message
     * Uses closest('.form-group') to find parent container (cleaner approach)
     */
    function showError(input, msg) {
        const group = input.closest('.form-group');
        if (!group) return;

        clearError(input);

        // Add error class to input
        input.classList.add('error');

        const p = document.createElement('p');
        p.classList.add('error-msg');
        p.textContent = msg;
        group.appendChild(p);
    }

    /**
     * Clear Error Message
     * Removes error display and styling
     */
    function clearError(input) {
        if (!input) return;

        const group = input.closest('.form-group');
        if (!group) return;

        // Remove error class from input
        input.classList.remove('error');

        const msg = group.querySelector('.error-msg');
        if (msg) msg.remove();
    }
})();
