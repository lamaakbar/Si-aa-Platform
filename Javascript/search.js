// search.js - Works with your existing HTML design
// Flask backend integration for Si'aa

const API_BASE_URL = 'http://localhost:5000/api';

let currentUser = null;
let allSpaces = [];

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Si\'aa search page loaded');
    
    // Check if user is logged in (optional)
    const userData = localStorage.getItem('user') || localStorage.getItem('siaaUser');
    if (userData) {
        currentUser = JSON.parse(userData);
    }
    
    // Setup form submission
    setupFormListener();
    
    // Load initial results
    loadStorageSpaces();
});

function setupFormListener() {
    const form = document.querySelector('.filter-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Form submitted, searching...');
            await searchSpaces();
        });
        console.log('✓ Form listener added');
    } else {
        console.warn('✗ Form not found');
    }
}

async function searchSpaces() {
    // Get form values from YOUR HTML structure
    const location = document.querySelector('select[name="location_neighborhood"]')?.value || '';
    const size = document.querySelector('select[name="storage_size"]')?.value || '';
    const priceMax = document.querySelector('input[name="price_max"]')?.value || '';
    const rentalDate = document.querySelector('input[name="rental_date"]')?.value || '';
    const itemsType = document.querySelector('select[name="items_type"]')?.value || '';
    const duration = document.querySelector('select[name="rental_duration"]')?.value || '';
    
    // Get environment checkboxes
    const environmentOptions = [];
    document.querySelectorAll('input[name="environment[]"]:checked').forEach(checkbox => {
        environmentOptions.push(checkbox.value);
    });
    
    // Build query parameters for Flask backend
    const params = new URLSearchParams();
    
    // Map your location to city for database query
    if (location && location !== '') {
        params.append('city', 'Jeddah'); // All your neighborhoods are in Jeddah
        params.append('searchTerm', location); // Search in description/location
    }
    
    // Map size to square meters
    if (size && size !== 'select') {
        switch(size) {
            case 'small':
                params.append('minSize', '1');
                params.append('maxSize', '3');
                break;
            case 'medium':
                params.append('minSize', '4');
                params.append('maxSize', '7');
                break;
            case 'large':
                params.append('minSize', '8');
                params.append('maxSize', '12');
                break;
            case 'xl':
                params.append('minSize', '12');
                params.append('maxSize', '1000');
                break;
        }
    }
    
    // Price filter
    if (priceMax) {
        params.append('maxPrice', priceMax);
    }
    
    // Environment options
    if (environmentOptions.includes('temperature') || environmentOptions.includes('climate')) {
        params.append('hasClimateControl', 'true');
    }
    if (environmentOptions.includes('secure')) {
        params.append('hasSecurityCameras', 'true');
    }
    
    console.log('Searching with params:', params.toString());
    
    try {
        const response = await fetch(`${API_BASE_URL}/spaces/search?${params}`);
        const data = await response.json();
        
        if (data.success) {
            allSpaces = data.spaces;
            displayResults(data.spaces);
        } else {
            console.error('Search failed:', data.error);
            showNoResults();
        }
    } catch (error) {
        console.error('Search error:', error);
        showNoResults();
    }
}

async function loadStorageSpaces() {
    // Load all available spaces on page load
    console.log('Loading all spaces...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/spaces/search`);
        const data = await response.json();
        
        if (data.success) {
            allSpaces = data.spaces;
            displayResults(data.spaces);
        }
    } catch (error) {
        console.error('Error loading spaces:', error);
        showNoResults();
    }
}

function displayResults(spaces) {
    const resultsList = document.querySelector('.storage-results__list');
    
    if (!resultsList) {
        console.warn('Results list not found');
        return;
    }
    
    if (!spaces || spaces.length === 0) {
        showNoResults();
        return;
    }
    
    // Clear existing results
    resultsList.innerHTML = '';
    
    // Add each space as a card
    spaces.forEach(space => {
        const card = createStorageCard(space);
        resultsList.appendChild(card);
    });
    
    console.log(`Displayed ${spaces.length} results`);
}

function createStorageCard(space) {
    const article = document.createElement('article');
    article.className = 'storage-card';
    
    // Calculate match score (simple algorithm based on features)
    const matchScore = calculateMatchScore(space);
    
    // Build features text
    const features = [];
    if (space.ClimateControl) features.push('Climate-controlled');
    if (space.SecurityCameras) features.push('Secure');
    if (space.Access24_7) features.push('24/7 Access');
    
    const featuresText = features.length > 0 ? ' · ' + features.join(' · ') : '';
    
    article.innerHTML = `
        <div class="storage-card__image" style="background-image: url('${space.ImageURL || '../Media/default-storage.png'}');"></div>
        
        <div class="storage-card__content">
            <div class="storage-card__header">
                <h3 class="storage-card__title">${escapeHtml(space.Title)} · ${escapeHtml(space.City)}</h3>
                <span class="storage-card__match">${matchScore}% Match</span>
            </div>
            
            <p class="storage-card__meta">${space.SizeInSqMeters} m² · ${escapeHtml(space.SpaceType)}${featuresText}</p>
            <p class="storage-card__description">
                ${escapeHtml(space.Description || 'Storage space available for rent.')}
            </p>
            
            <div class="storage-card__footer">
                <div class="storage-card__price">
                    <span class="storage-card__price-value">${space.PricePerMonth} SAR</span>
                    <span class="storage-card__price-unit">/ month</span>
                </div>
                
                <a href="#" class="btn btn-outline btn-small" onclick="bookSpace(${space.SpaceID}); return false;">
                    Book This Space
                </a>
            </div>
        </div>
    `;
    
    return article;
}

function calculateMatchScore(space) {
    // Simple match algorithm - you can enhance this
    let score = 75; // Base score
    
    // Add points for features
    if (space.ClimateControl) score += 5;
    if (space.SecurityCameras) score += 5;
    if (space.Access24_7) score += 5;
    if (space.AverageRating > 4) score += 10;
    
    return Math.min(score, 99);
}

function showNoResults() {
    const resultsList = document.querySelector('.storage-results__list');
    
    if (resultsList) {
        resultsList.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #666;">
                <p style="font-size: 18px; margin-bottom: 10px;">No storage spaces found</p>
                <p style="font-size: 14px;">Try adjusting your filters or search criteria</p>
            </div>
        `;
    }
}

function bookSpace(spaceId) {
    console.log('Booking space:', spaceId);
    
    if (!currentUser) {
        // User not logged in - redirect to login
        if (confirm('You need to login to book a space. Would you like to login now?')) {
            localStorage.setItem('pendingBookingSpaceId', spaceId);
            window.location.href = 'login.html';
        }
        return;
    }
    
    // User is logged in - redirect to booking page with space ID
    window.location.href = `booking.html?spaceId=${spaceId}`;
}

// Setup sorting
document.addEventListener('DOMContentLoaded', () => {
    const sortSelect = document.getElementById('sortBy');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            sortResults(sortSelect.value);
        });
        console.log('✓ Sort listener added');
    }
});

function sortResults(sortBy) {
    if (!allSpaces || allSpaces.length === 0) return;
    
    let sorted = [...allSpaces];
    
    switch(sortBy) {
        case 'priceLow':
            sorted.sort((a, b) => a.PricePerMonth - b.PricePerMonth);
            break;
        case 'priceHigh':
            sorted.sort((a, b) => b.PricePerMonth - a.PricePerMonth);
            break;
        case 'match':
            sorted.sort((a, b) => calculateMatchScore(b) - calculateMatchScore(a));
            break;
        case 'distance':
            // Would need geolocation - for now just by city
            sorted.sort((a, b) => a.City.localeCompare(b.City));
            break;
    }
    
    displayResults(sorted);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

console.log('✓ Si\'aa search.js loaded successfully');