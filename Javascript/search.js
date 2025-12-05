/**
 * Si'aa Platform - Semantic Search Handler
 * Integrates with backend API using sentence-transformers model
 */

(function() {
    'use strict';

    const API_BASE_URL = 'http://localhost:5000/api';

    document.addEventListener('DOMContentLoaded', function() {
        initializeSearchForm();
        initializeSorting();
    });

    /**
     * Initialize search form handler
     */
    function initializeSearchForm() {
        const form = document.querySelector('.filter-form');
        if (!form) return;

        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            await performSearch();
        });
    }

    /**
     * Initialize sorting functionality
     */
    function initializeSorting() {
        const sortSelect = document.getElementById('sortBy');
        if (sortSelect) {
            sortSelect.addEventListener('change', function() {
                const currentResults = window.currentSearchResults || [];
                if (currentResults.length > 0) {
                    displayResults(sortResults(currentResults, this.value));
                }
            });
        }
    }

    /**
     * Perform semantic search
     */
    async function performSearch() {
        const form = document.querySelector('.filter-form');
        if (!form) return;

        // Show loading state
        showLoadingState();

        // Collect form data
        const formData = new FormData(form);
        const filters = {
            location_neighborhood: formData.get('location_neighborhood') || '',
            storage_size: formData.get('storage_size') || '',
            items_type: formData.get('items_type') || '',
            rental_duration: formData.get('rental_duration') || '',
            price_max: parseFloat(formData.get('price_max')) || null,
            rental_date: formData.get('rental_date') || '',
            environment: formData.getAll('environment[]') || []
        };

        // Build query text from filters
        const queryParts = [];
        if (filters.location_neighborhood) {
            queryParts.push(`storage in ${filters.location_neighborhood}`);
        }
        if (filters.storage_size) {
            queryParts.push(filters.storage_size);
        }
        if (filters.items_type) {
            queryParts.push(filters.items_type);
        }
        if (filters.environment.length > 0) {
            queryParts.push(filters.environment.join(' '));
        }

        const query = queryParts.join(' ') || 'storage space';

        try {
            const response = await fetch(`${API_BASE_URL}/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: query,
                    filters: filters
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                window.currentSearchResults = data.results;
                displayResults(data.results);
            } else {
                showError('Search failed: ' + (data.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Search error:', error);
            showError('Unable to connect to search service. Please make sure the backend server is running.');
            showNoResults();
        }
    }

    /**
     * Display search results
     */
    function displayResults(results) {
        const resultsContainer = document.querySelector('.storage-results__list');
        if (!resultsContainer) return;

        // Clear previous results
        resultsContainer.innerHTML = '';

        if (results.length === 0) {
            showNoResults();
            return;
        }

        // Create result cards
        results.forEach(space => {
            const card = createSpaceCard(space);
            resultsContainer.appendChild(card);
        });

        // Update results count
        updateResultsCount(results.length);
    }

    /**
     * Create a storage space card element
     */
    function createSpaceCard(space) {
        const article = document.createElement('article');
        article.className = 'storage-card';

        // Format conditions
        const conditions = space.conditions || [];
        const conditionsText = conditions.length > 0 
            ? conditions.join(' · ') 
            : 'Standard storage';

        // Format size
        const sizeText = space.size ? `${space.size} m²` : 'Size not specified';

        // Format price
        const priceText = space.price ? `${space.price} SAR` : 'Price not set';
        const priceUnit = '/ month'; // Could be dynamic based on rental_duration

        article.innerHTML = `
            <div class="storage-card__image"></div>
            <div class="storage-card__content">
                <div class="storage-card__header">
                    <h3 class="storage-card__title">${escapeHtml(space.title || 'Storage Space')} · ${escapeHtml(space.neighborhood || '')}</h3>
                    <span class="storage-card__match">${space.match_score}% Match</span>
                </div>
                <p class="storage-card__meta">${sizeText} · ${escapeHtml(space.type || '')} · ${conditionsText}</p>
                <p class="storage-card__description">
                    ${escapeHtml(space.description || 'No description available.')}
                </p>
                <div class="storage-card__footer">
                    <div class="storage-card__price">
                        <span class="storage-card__price-value">${priceText}</span>
                        <span class="storage-card__price-unit">${priceUnit}</span>
                    </div>
                    <a href="booking.html?space_id=${space.id}" class="btn btn-outline btn-small">Book This Space</a>
                </div>
            </div>
        `;

        return article;
    }

    /**
     * Sort results based on selected option
     */
    function sortResults(results, sortBy) {
        const sorted = [...results];

        switch(sortBy) {
            case 'match':
                // Already sorted by match score (highest first)
                break;
            case 'priceLow':
                sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
                break;
            case 'priceHigh':
                sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
                break;
            case 'distance':
                // Distance sorting would require location data
                // For now, keep match order
                break;
            default:
                // Default to match score
                sorted.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
        }

        return sorted;
    }

    /**
     * Show loading state
     */
    function showLoadingState() {
        const resultsContainer = document.querySelector('.storage-results__list');
        if (!resultsContainer) return;

        resultsContainer.innerHTML = `
            <div class="loading-state" style="text-align: center; padding: 3rem;">
                <p style="font-size: 1.1rem; color: #666;">Searching with AI...</p>
                <p style="font-size: 0.9rem; color: #999; margin-top: 0.5rem;">Finding the best matches for you</p>
            </div>
        `;
    }

    /**
     * Show no results message
     */
    function showNoResults() {
        const resultsContainer = document.querySelector('.storage-results__list');
        if (!resultsContainer) return;

        resultsContainer.innerHTML = `
            <div class="no-results" style="text-align: center; padding: 3rem;">
                <p style="font-size: 1.1rem; color: #666;">No storage spaces found</p>
                <p style="font-size: 0.9rem; color: #999; margin-top: 0.5rem;">
                    Try adjusting your search filters or check back later.
                </p>
            </div>
        `;

        updateResultsCount(0);
    }

    /**
     * Show error message
     */
    function showError(message) {
        const resultsContainer = document.querySelector('.storage-results__list');
        if (!resultsContainer) return;

        resultsContainer.innerHTML = `
            <div class="error-state" style="text-align: center; padding: 3rem;">
                <p style="font-size: 1.1rem; color: #d32f2f;">Error</p>
                <p style="font-size: 0.9rem; color: #666; margin-top: 0.5rem;">${escapeHtml(message)}</p>
            </div>
        `;
    }

    /**
     * Update results count display
     */
    function updateResultsCount(count) {
        const resultsTitle = document.querySelector('.storage-results__title');
        if (resultsTitle) {
            resultsTitle.textContent = `Results (${count})`;
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Export for potential external use
    window.siaaSearch = {
        performSearch: performSearch
    };

})();


