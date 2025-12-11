// Javascript/payment.js

(function () {
    'use strict';

    const API_BASE_URL = 'http://localhost:5000/api';

    let bookingSummary = null;
    let currentUser = null;

    document.addEventListener('DOMContentLoaded', () => {
        // Load user from localStorage (support both shapes)
        const storedUser = localStorage.getItem('siaaUser') || localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                currentUser = parsed.user || parsed; // handle { user: {...} } or plain object
            } catch (e) {
                console.warn('Could not parse user from localStorage', e);
            }
        }

        // Load booking summary from booking page
        const summaryStr = localStorage.getItem('siaaBookingSummary');
        if (summaryStr) {
            try {
                bookingSummary = JSON.parse(summaryStr);
            } catch (e) {
                console.warn('Could not parse booking summary', e);
            }
        }

        populateSummaryUI();

        const form = document.querySelector('.payment-form');
        if (form) {
            form.addEventListener('submit', handlePaymentSubmit);
        }
    });

    // ---------- UI POPULATION & FEES ----------

    function populateSummaryUI() {
        if (!bookingSummary) return;

        const baseAmount = parseEstimatedTotal(bookingSummary.estimatedTotal);
        if (baseAmount == null || isNaN(baseAmount)) return;

        // fees
        const TAX_RATE = 0.15;        // 15%
        const INSURANCE_RATE = 0.05;  // 5%
        const hasLogistics = bookingSummary.logisticsOption === 'partner_pickup';
        const LOGISTICS_RATE = hasLogistics ? 0.07 : 0; // 7% if required

        const taxAmount = round2(baseAmount * TAX_RATE);
        const insuranceAmount = round2(baseAmount * INSURANCE_RATE);
        const logisticsAmount = round2(baseAmount * LOGISTICS_RATE);
        const grandTotal = round2(baseAmount + taxAmount + insuranceAmount + logisticsAmount);

        // keep final total in memory so we send it to backend
        bookingSummary.baseAmount = baseAmount;
        bookingSummary.finalTotal = grandTotal;

        const format = v => `${v.toFixed(2)} SAR`;

        // Storage (base)
        const storageField = document.querySelector(
            '.payment-summary-item:nth-child(1) .payment-summary-item-value'
        );
        if (storageField) {
            storageField.textContent = format(baseAmount);
        }

        // Logistics fee row
        const logisticsField = document.querySelector(
            '.payment-summary-item:nth-child(2) .payment-summary-item-value'
        );
        if (logisticsField) {
            if (hasLogistics) {
                logisticsField.textContent = `7% (${format(logisticsAmount)})`;
            } else {
                logisticsField.textContent = format(0);
            }
        }

        // Insurance fee
        const insuranceField = document.querySelector(
            '.payment-summary-item:nth-child(3) .payment-summary-item-value'
        );
        if (insuranceField) {
            insuranceField.textContent = format(insuranceAmount);
        }

        // TAX
        const taxField = document.querySelector(
            '.payment-summary-item:nth-child(4) .payment-summary-item-value'
        );
        if (taxField) {
            taxField.textContent = format(taxAmount);
        }

        // Total on the right card
        const totalSpan = document.querySelector('.payment-summary-total-value');
        if (totalSpan) {
            totalSpan.textContent = ` ${format(grandTotal)}`;
        }
    }

    // ---------- FORM VALIDATION & SUBMIT ----------

    async function handlePaymentSubmit(e) {
    e.preventDefault();

    const cardHolder = document.getElementById('cardHolder');
    const cardNumber = document.getElementById('cardNumber');
    const ccv = document.getElementById('ccv');
    const expiryDate = document.getElementById('expiryDate');

    // clear old errors
    [cardHolder, cardNumber, ccv, expiryDate].forEach(inp => {
        if (inp) inp.classList.remove('error');
    });

    // Card holder
    if (!cardHolder.value.trim()) {
        return setInputError(cardHolder, 'Please enter card holder name.');
    }

    // Card number: 16 digits
    const rawCard = cardNumber.value.replace(/\s+/g, '');
    if (!/^\d{16}$/.test(rawCard)) {
        return setInputError(cardNumber, 'Please enter a valid 16-digit card number.');
    }

    // CCV: 3 digits
    const rawCcv = ccv.value.replace(/\D/g, '');
    if (!/^\d{3}$/.test(rawCcv)) {
        return setInputError(ccv, 'Please enter a valid 3-digit CCV.');
    }

    // Expiry: MM/YY and not in the past
    const expiryRaw = expiryDate.value.trim();
    if (!/^\d{2}\s*\/\s*\d{2}$/.test(expiryRaw)) {
        return setInputError(expiryDate, 'Please enter a valid expiry date (MM/YY).');
    }

    const [mmStr, yyStr] = expiryRaw.replace(/\s/g, '').split('/');
    const month = parseInt(mmStr, 10);
    const year = 2000 + parseInt(yyStr, 10);

    if (month < 1 || month > 12 || isNaN(year)) {
        return setInputError(expiryDate, 'Invalid expiry month or year.');
    }

    const now = new Date();
    const expDate = new Date(year, month); // first day of month after expiry
    if (expDate <= now) {
        return setInputError(expiryDate, 'This card is expired.');
    }

    if (!bookingSummary) {
        alert('Booking details are missing. Please start again from the search page.');
        return;
    }

    if (!currentUser) {
        alert('You must be logged in to complete the payment.');
        return;
    }

    const seekerId =
        currentUser.id ||
        currentUser.UserID ||
        currentUser.SeekerID ||
        currentUser.userId;

    if (!seekerId) {
        alert('Could not detect seeker ID. Please log in again.');
        return;
    }

    // amount we calculated earlier in populateSummaryUI()
    const totalToCharge =
        typeof bookingSummary.finalTotal === 'number'
            ? bookingSummary.finalTotal
            : parseEstimatedTotal(bookingSummary.estimatedTotal);

    const payload = {
        seekerId: Number(seekerId),
        spaceId: Number(bookingSummary.spaceId),
        startDate: bookingSummary.startDate,
        endDate: bookingSummary.endDate,
        totalAmount: totalToCharge
    };

    console.log('Booking payload being sent:', payload);

    try {
        const res = await fetch(`${API_BASE_URL}/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        let data = null;
        try {
            data = await res.json();
        } catch (err) {
            console.warn('Could not parse JSON from booking API', err);
        }

        console.log('Booking API raw response:', res.status, data);

        // treat any explicit success:false OR non-2xx as failure
        if (!res.ok || (data && data.success === false)) {
            const msg =
                (data && (data.error || data.message)) ||
                `Booking API error (status ${res.status})`;
            console.error('Booking creation failed:', data);
            alert(msg);
            return;
        }

        // success (data may or may not have .success === true)
        localStorage.removeItem('siaaBookingSummary');
        alert('Payment successful! Your booking has been created.');
        window.location.href = 'search.html';

    } catch (err) {
        console.error('Error creating booking:', err);
        alert('Server error creating booking. Please try again later.');
    }
}

    // ---------- HELPERS ----------

    function setInputError(input, message) {
        if (input) {
            input.classList.add('error');
            input.focus();
        }
        alert(message);
        return false;
    }

    function parseEstimatedTotal(text) {
        if (!text) return null;
        // Take only numbers and decimal separator
        const cleaned = text.toString().replace(/[^\d.,]/g, '').replace(',', '.');
        const value = parseFloat(cleaned);
        return isNaN(value) ? null : value;
    }

    function round2(num) {
        return Math.round(num * 100) / 100;
    }
})();
