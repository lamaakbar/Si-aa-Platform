// Javascript/booking.js

(function () {
    'use strict';

    const API_BASE_URL = 'http://localhost:5000/api'; // same as search.js

    document.addEventListener('DOMContentLoaded', () => {
        const params = new URLSearchParams(window.location.search);
        const spaceId = params.get('space_id') || null;
        const startDate = params.get('start') || null;
        const endDate = params.get('end') || null;

        // Fill dates on the side card even if we don't have backend yet
        updateSideDates(startDate, endDate);

        if (spaceId) {
            fetchSpaceDetails(spaceId, startDate, endDate);
        }

        const btn = document.getElementById('proceedToPaymentBtn');
        if (btn) {
            btn.addEventListener('click', () =>
                handleProceedToPayment(spaceId, startDate, endDate)
            );
        }
    });

    async function fetchSpaceDetails(spaceId, startDate, endDate) {
        try {
            const res = await fetch(`${API_BASE_URL}/spaces/${spaceId}`);
            if (!res.ok) throw new Error('Failed to fetch space details');

            const data = await res.json();
            // Depending on your API, adjust: maybe data.space instead of data
            const space = data.space || data;

            fillSpaceDetails(space, startDate, endDate);
        } catch (err) {
            console.warn('Using static placeholders because API failed:', err);
            // We already have reasonable placeholder text from HTML.
        }
    }

    function fillSpaceDetails(space, startDate, endDate) {
        // Basic fields
        setText('bookingType', space.type || 'Storage Space');
        setText(
            'bookingAddress',
            space.address || space.neighborhood || 'Jeddah'
        );
        setText(
            'bookingPrice',
            space.price ? `${space.price} SAR / ${space.duration || 'month'}` : '—'
        );
        setText(
            'bookingDistance',
            space.distance_km ? `${space.distance_km} km away` : 'Nearby'
        );
        setText(
            'bookingSize',
            space.size ? `${space.size} m²` : (space.size_label || '—')
        );

        // Tags / conditions
        if (Array.isArray(space.conditions) && space.conditions.length > 0) {
            const tagsContainer = document.getElementById('bookingTags');
            if (tagsContainer) {
                tagsContainer.innerHTML = '';
                space.conditions.forEach((c) => {
                    const span = document.createElement('span');
                    span.className = 'booking-tag';
                    span.textContent = c;
                    tagsContainer.appendChild(span);
                });
            }
        }

        // Owner
        if (space.owner) {
            setText('ownerName', space.owner.name || '');
            setText('ownerPhone', space.owner.phone || '');
            setText('ownerEmail', space.owner.email || '');
        }

        // Side summary
        const sideSpaceValue = [
            space.type || 'Storage',
            space.neighborhood || space.city || 'Jeddah'
        ]
            .filter(Boolean)
            .join(' · ');
        setText('sideSpaceType', sideSpaceValue);

        const total = space.estimated_total || space.price || null;
        if (total) setText('sideTotal', `${total} SAR`);

        updateSideDates(startDate, endDate);
    }

    function updateSideDates(start, end) {
        const el = document.getElementById('sideDates');
        if (!el) return;

        if (!start && !end) {
            el.textContent = 'Select dates in the search step';
        } else if (start && end) {
            el.textContent = `${start} → ${end}`;
        } else {
            el.textContent = start || end;
        }
    }

    function handleProceedToPayment(spaceId, startDate, endDate) {
        const errorEl = document.getElementById('bookingError');
        if (errorEl) {
            errorEl.style.display = 'none';
            errorEl.textContent = '';
        }

        const selectedLogistics = document.querySelector(
            'input[name="logisticsOption"]:checked'
        );
        if (!selectedLogistics) {
            showBookingError('Please choose a logistics option.');
            return;
        }

        // Collect a small summary from the DOM
        const summary = {
            spaceId: spaceId,
            logisticsOption: selectedLogistics.value,
            type: getText('bookingType'),
            address: getText('bookingAddress'),
            priceLabel: getText('bookingPrice'),
            sizeLabel: getText('bookingSize'),
            dates: getText('sideDates'),
            estimatedTotal: getText('sideTotal'),
            startDate,
            endDate
        };

        try {
            localStorage.setItem('siaaBookingSummary', JSON.stringify(summary));
        } catch (err) {
            console.warn('Could not store booking summary in localStorage', err);
        }

        // If you later implement an API call createBooking(...) it can go here
        // Then redirect to payment page:
        window.location.href = 'payment.html';
    }

    function showBookingError(msg) {
        const errorEl = document.getElementById('bookingError');
        if (!errorEl) return;
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
    }

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function getText(id) {
        const el = document.getElementById(id);
        return el ? el.textContent.trim() : '';
    }
})();
