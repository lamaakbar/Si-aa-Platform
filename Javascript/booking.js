// Javascript/booking.js

(function () {
    'use strict';

    const API_BASE_URL = 'http://localhost:5000/api'; // same as search.js
    let currentSpace = null; // store the space object globally so we can reuse it

    document.addEventListener('DOMContentLoaded', () => {
        const params = new URLSearchParams(window.location.search);
        const rawSpaceId = params.get('space_id') || params.get('spaceId');
        const spaceId = rawSpaceId ? Number(rawSpaceId) : null;
        const startFromQuery = params.get('start') || null;
        const endFromQuery = params.get('end') || null;

        // Fill dates in the side summary (initial)
        updateSideDates(startFromQuery, endFromQuery);

        // Fill the date inputs
        const startInput = document.getElementById('bookingStartDate');
        const endInput = document.getElementById('bookingEndDate');

        if (startInput && startFromQuery) {
            startInput.value = startFromQuery;
        }
        if (endInput && endFromQuery) {
            endInput.value = endFromQuery;
        }

        // Keep side summary + total updated when user changes dates
        if (startInput) {
            startInput.addEventListener('change', () => {
                const s = startInput.value;
                const e = endInput ? endInput.value : null;

                updateSideDates(s, e);
                if (currentSpace) {
                    updateSideTotal(currentSpace, s, e);
                }
            });
        }
        if (endInput) {
            endInput.addEventListener('change', () => {
                const s = startInput ? startInput.value : null;
                const e = endInput.value;

                updateSideDates(s, e);
                if (currentSpace) {
                    updateSideTotal(currentSpace, s, e);
                }
            });
        }

        if (spaceId) {
            fetchSpaceDetails(spaceId, startFromQuery, endFromQuery);
        }

        const btn = document.getElementById('proceedToPaymentBtn');
        if (btn) {
            btn.addEventListener('click', () =>
                handleProceedToPayment(spaceId)
            );
        }
    });

    async function fetchSpaceDetails(spaceId, startDate, endDate) {
        try {
            const res = await fetch(`${API_BASE_URL}/spaces/${spaceId}`);
            if (!res.ok) throw new Error('Failed to fetch space details');

            const data = await res.json();
            const space = data.space || data;

            fillSpaceDetails(space, startDate, endDate);
        } catch (err) {
            console.warn('Using static placeholders because API failed:', err);
            // HTML placeholders will stay as fallback
        }
    }

    function fillSpaceDetails(space, startDate, endDate) {
        // Save globally so other functions can use it
        currentSpace = space;

        // Type
        setText('bookingType', space.SpaceType || 'Storage Space');

        // Address
        setText(
            'bookingAddress',
            space.Location || space.City || 'Jeddah'
        );

        // Price
        setText(
            'bookingPrice',
            space.PricePerMonth
                ? `${space.PricePerMonth} SAR / month`
                : '—'
        );

        // Distance (fallback)
        setText(
            'bookingDistance',
            space.distance_km ? `${space.distance_km} km away` : 'Nearby'
        );

        // Size
        setText(
            'bookingSize',
            space.Size ? `${space.Size} m²` : '—'
        );

        // Tags (simple version)
        const tagsContainer = document.getElementById('bookingTags');
        if (tagsContainer) {
            tagsContainer.innerHTML = '';

            const tags = [];
            if (space.ClimateControl || space.ClimateControlled) tags.push('Climate-controlled');
            if (space.SecurityCameras || space.CCTVMonitored) tags.push('Secure / CCTV');
            if (space.Access24_7) tags.push('24/7 access');

            if (tags.length === 0) tags.push('Standard space');

            tags.forEach(t => {
                const span = document.createElement('span');
                span.className = 'booking-tag';
                span.textContent = t;
                tagsContainer.appendChild(span);
            });
        }

        // Owner
        setText('ownerName', space.ProviderName || '');
        setText('ownerPhone', space.ProviderPhone || '');
        setText('ownerEmail', space.ProviderEmail || '');

        // Side summary
        const sideSpaceValue = [
            space.SpaceType || 'Storage',
            space.City || 'Jeddah'
        ].filter(Boolean).join(' · ');
        setText('sideSpaceType', sideSpaceValue);

        // Dates + total
        updateSideDates(startDate, endDate);
        updateSideTotal(space, startDate, endDate);

        console.log('Space loaded for booking:', space.SpaceID || '(no ID)');
    }

    function updateSideDates(start, end) {
        const el = document.getElementById('sideDates');
        if (!el) return;

        if (!start && !end) {
            el.textContent = 'Select your dates';
        } else if (start && end) {
            el.textContent = `${start} → ${end}`;
        } else {
            el.textContent = start || end;
        }
    }

    function updateSideTotal(space, start, end) {
        const el = document.getElementById('sideTotal');
        if (!el) return;

        // If no dates → no total
        if (!start || !end) {
            el.textContent = '0 SAR';
            return;
        }

        const startDate = new Date(start);
        const endDate = new Date(end);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate > endDate) {
            el.textContent = '0 SAR';
            return;
        }

        const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) || 1;

        let total = 0;

        if (space.PricePerDay) {
            total = diffDays * space.PricePerDay;
        } else if (space.PricePerWeek) {
            total = Math.ceil(diffDays / 7) * space.PricePerWeek;
        } else if (space.PricePerMonth) {
            total = Math.ceil(diffDays / 30) * space.PricePerMonth;
        }

        el.textContent = `${total} SAR`;
    }

    function handleProceedToPayment(spaceId) {
        const errorEl = document.getElementById('bookingError');
        if (errorEl) {
            errorEl.style.display = 'none';
            errorEl.textContent = '';
        }

        if (!spaceId) {
            showBookingError('Space is missing. Please go back to search.');
            return;
        }

        const startInput = document.getElementById('bookingStartDate');
        const endInput = document.getElementById('bookingEndDate');

        const startDate = startInput ? startInput.value : '';
        const endDate = endInput ? endInput.value : '';

        if (!startDate || !endDate) {
            showBookingError('Please select both start and end dates.');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            showBookingError('Start date cannot be after end date.');
            return;
        }

        const selectedLogistics = document.querySelector(
            'input[name="logisticsOption"]:checked'
        );
        if (!selectedLogistics) {
            showBookingError('Please choose a logistics option.');
            return;
        }

        // Make sure total is up to date just before saving
        if (currentSpace) {
            updateSideTotal(currentSpace, startDate, endDate);
        }

        const sideTotalEl = document.getElementById('sideTotal');
        const totalText = sideTotalEl ? sideTotalEl.textContent : '0 SAR';

        // Collect a small summary from the DOM
        const summary = {
            spaceId: spaceId,
            logisticsOption: selectedLogistics.value,
            type: getText('bookingType'),
            address: getText('bookingAddress'),
            priceLabel: getText('bookingPrice'),
            sizeLabel: getText('bookingSize'),
            datesLabel: getText('sideDates'),
            estimatedTotal: totalText,
            startDate,
            endDate
        };

        try {
            localStorage.setItem('siaaBookingSummary', JSON.stringify(summary));
        } catch (err) {
            console.warn('Could not store booking summary in localStorage', err);
        }

        // Redirect to payment page
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
