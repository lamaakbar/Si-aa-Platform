/* Rating and Review Handler */

(function() {
    'use strict';

    // Autobfill username (replace it with actual data later)
    const loggedInUserName = "Lama Akbar";

    document.addEventListener('DOMContentLoaded', function() {
        initializeRating();
    });

    function initializeRating() {
        const nameInput = document.getElementById('name');
        if (nameInput) {
            nameInput.value = loggedInUserName;
        }

        setupStarRating();
    }

    function setupStarRating() {
        const stars = document.querySelectorAll('.star');
        const ratingInput = document.getElementById('rating');
        const ratingText = document.getElementById('rating-text');

        if (!stars.length || !ratingInput || !ratingText) {
            return;
        }

        const ratingLabels = {
            1: "Very Bad",
            2: "Poor",
            3: "Average",
            4: "Good",
            5: "Excellent"
        };

        stars.forEach(star => {
            // Hover effect
            star.addEventListener('mouseenter', function() {
                const value = parseInt(star.getAttribute('data-value'));
                stars.forEach(s => {
                    const sValue = parseInt(s.getAttribute('data-value'));
                    s.classList.toggle('hovered', sValue <= value);
                });
                ratingText.innerText = ratingLabels[value];
            });

            // Mouse leave, restore previous state
            star.addEventListener('mouseleave', function() {
                stars.forEach(s => s.classList.remove('hovered'));
                if (ratingInput.value == 0) {
                    ratingText.innerText = 'Select Rating';
                } else {
                    ratingText.innerText = ratingLabels[ratingInput.value];
                }
            });

            // Click - set the rat4
            star.addEventListener('click', function() {
                const value = parseInt(star.getAttribute('data-value'));
                ratingInput.value = value;

                stars.forEach(s => {
                    const sValue = parseInt(s.getAttribute('data-value'));
                    s.classList.toggle('selected', sValue <= value);
                });

                ratingText.innerText = ratingLabels[value];
            });
        });
    }

    // Make addReview global so it can be called from onclick
    window.addReview = function() {
        const nameInput = document.getElementById('name');
        const ratingInput = document.getElementById('rating');
        const reviewTextarea = document.getElementById('review');
        const reviewsList = document.getElementById('reviews-list');

        if (!nameInput || !ratingInput || !reviewTextarea || !reviewsList) {
            return;
        }

        const name = nameInput.value.trim();
        const rating = parseInt(ratingInput.value) || 0;
        const review = reviewTextarea.value.trim();

        if (rating === 0) {
            alert('Please select a rating.');
            return;
        }

        if (!review) {
            alert('Please write your review.');
            return;
        }

        // Create stars display
        const filledStars = '★'.repeat(rating);
        const emptyStars = '☆'.repeat(5 - rating);
        const stars = filledStars + emptyStars;

        // Create review card HTML
        const card = `
            <div class="review-card">
                <div class="review-header">
                    <span class="review-name">${escapeHtml(name)}</span>
                    <span class="stars">${stars}</span>
                </div>
                <p class="review-text">${escapeHtml(review)}</p>
            </div>
        `;

        // Add review to list
        reviewsList.insertAdjacentHTML('beforeend', card);

        // Reset form
        ratingInput.value = '0';
        reviewTextarea.value = '';
        
        // Reset star display
        const starsElements = document.querySelectorAll('.star');
        starsElements.forEach(s => s.classList.remove('selected', 'hovered'));
        
        const ratingText = document.getElementById('rating-text');
        if (ratingText) {
            ratingText.innerText = 'Select Rating';
        }
    };

    // Helper function to escape HTML (prevent XSS)
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
})();





