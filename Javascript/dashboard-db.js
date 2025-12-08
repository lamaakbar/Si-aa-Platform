// dashboard-db.js - Frontend JavaScript for Si'aa Dashboard

// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// User session management
let currentUser = null;

// =============================================
// INITIALIZATION
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    checkAuthentication();

    // Setup event listeners
    setupEventListeners();
});

// =============================================
// AUTHENTICATION
// =============================================

function checkAuthentication() {
    const userDataStr = localStorage.getItem('siaaUser');
    const token = localStorage.getItem('siaaToken');

    if (!userDataStr || !token) {
        // Show login prompt instead of redirecting
        showLoginPrompt();
        return;
    }

    try {
        currentUser = JSON.parse(userDataStr);
        initializeDashboard();
    } catch (error) {
        console.error('Error parsing user data:', error);
        logout();
    }
}

function showLoginPrompt() {
    // Hide all dashboard content
    const dashboardMain = document.querySelector('.dashboard-main');
    const sidebar = document.querySelector('.sideBar');

    if (sidebar) {
        sidebar.style.display = 'none';
    }

    if (dashboardMain) {
        dashboardMain.innerHTML = `
            <div class="container">
                <div class="login-prompt">
                    <div class="login-prompt-icon">
                        <i class="fa-solid fa-lock"></i>
                    </div>
                    <h2 class="login-prompt-title">Access Required</h2>
                    <p class="login-prompt-text">
                        Please log in to view your dashboard and manage your storage.
                    </p>
                    <div class="login-prompt-actions">
                        <a href="login.html" class="btn btn-primary">
                            <i class="fa-solid fa-right-to-bracket"></i>
                            Log In
                        </a>
                        <a href="register.html" class="btn btn-secondary">
                            <i class="fa-solid fa-user-plus"></i>
                            Create Account
                        </a>
                    </div>
                    <p class="login-prompt-footer">
                        New to Si'aa? <a href="index.html">Learn more about our platform</a>
                    </p>
                </div>
            </div>
        `;
    }
}

function logout() {
    localStorage.removeItem('siaaUser');
    localStorage.removeItem('siaaToken');
    window.location.href = 'login.html';
}

// =============================================
// DASHBOARD INITIALIZATION
// =============================================

async function initializeDashboard() {
    try {
        // Update welcome message
        document.getElementById('userNameDisplay').textContent = currentUser.firstName;

        // Update role display
        const roleText = currentUser.userType === 'seeker' ? 'Storage Seeker' : 'Storage Provider';
        document.getElementById('userRoleDisplay').textContent = roleText;

        // Update action button
        const actionButton = document.getElementById('actionButton');
        if (currentUser.userType === 'seeker') {
            actionButton.textContent = 'Browse Spaces';
            actionButton.onclick = () => window.location.href = 'search.html';
        } else {
            actionButton.textContent = 'Add New Space';
            actionButton.onclick = () => window.location.href = 'search.html';
        }

        // Update history section title
        const historyTitle = document.getElementById('historyTitle');
        if (currentUser.userType === 'seeker') {
            historyTitle.textContent = 'My Bookings';
        } else {
            historyTitle.textContent = 'My Spaces';
        }

        // Update statistics labels
        const statTotalLabel = document.getElementById('statTotalLabel');
        if (currentUser.userType === 'seeker') {
            statTotalLabel.textContent = 'Total Bookings';
        } else {
            statTotalLabel.textContent = 'Total Spaces';
        }

        // Load profile data
        await loadProfile();

        // Load history data
        await loadHistory();

        // Load statistics
        await loadStatistics();

    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showError('Failed to initialize dashboard');
    }
}
// =============================================
// UTILITY: Price formatting & helpers
// =============================================

/**
 * Format a numeric price to have thousands separators and 2 decimals
 * Example: 1234.5 -> "1,234.50"
 */
function formatPrice(value) {
    if (value === null || value === undefined || isNaN(Number(value))) {
        return '0.00';
    }
    const num = Number(value);
    // Use toLocaleString for reliable grouping with two decimal places
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Format price with currency suffix (SAR)
 */
function formatPriceWithCurrency(value, suffix = 'SAR') {
    return `${formatPrice(value)} ${suffix}`;
}

// Small helper to safely get numeric value from API stats
function toNumber(v) {
    return v === null || v === undefined ? 0 : Number(v);
}

// =============================================
// PROFILE MANAGEMENT
// =============================================

async function loadProfile() {
    try {
        const response = await fetch(
            `${API_BASE_URL}/profile/${currentUser.userType}/${currentUser.id}`,
            {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('siaaToken')}`
                }
            }
        );

        if (!response.ok) {
            throw new Error('Failed to load profile');
        }

        const data = await response.json();
        const profile = data.profile;

        // Populate profile form
        document.getElementById('profileFirstName').value = profile.FirstName || '';
        document.getElementById('profileLastName').value = profile.LastName || '';
        document.getElementById('profileEmail').value = profile.Email || '';
        document.getElementById('profilePhone').value = profile.PhoneNumber || '';
        document.getElementById('profileRole').value =
            currentUser.userType === 'seeker' ? 'Storage Seeker' : 'Storage Provider';
        document.getElementById('profileStatus').value = profile.AccountStatus || '';

    } catch (error) {
        console.error('Profile load error:', error);
        showError('Failed to load profile data');
    }
}

async function updateProfile(formData) {
    try {
        const response = await fetch(
            `${API_BASE_URL}/profile/${currentUser.userType}/${currentUser.id}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('siaaToken')}`
                },
                body: JSON.stringify(formData)
            }
        );

        if (!response.ok) {
            throw new Error('Failed to update profile');
        }

        const data = await response.json();
        showSuccess('Profile updated successfully!');

        // Update current user data
        currentUser.firstName = formData.firstName;
        currentUser.lastName = formData.lastName;
        localStorage.setItem('siaaUser', JSON.stringify(currentUser));

        // Update display
        document.getElementById('userNameDisplay').textContent = currentUser.firstName;

    } catch (error) {
        console.error('Profile update error:', error);
        showError('Failed to update profile');
    }
}

// =============================================
// HISTORY MANAGEMENT
// =============================================

async function loadHistory() {
    const historyList = document.getElementById('historyList');
    const historyLoading = document.getElementById('historyLoading');
    const historyEmpty = document.getElementById('historyEmptyMessage');

    try {
        // Show loading
        historyLoading.style.display = 'block';
        historyList.innerHTML = '';
        historyEmpty.style.display = 'none';

        let response;
        if (currentUser.userType === 'seeker') {
            response = await fetch(
                `${API_BASE_URL}/seeker/${currentUser.id}/bookings`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('siaaToken')}`
                    }
                }
            );
        } else {
            response = await fetch(
                `${API_BASE_URL}/provider/${currentUser.id}/spaces`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('siaaToken')}`
                    }
                }
            );
        }

        if (!response.ok) {
            throw new Error('Failed to load history');
        }

        const data = await response.json();
        const items = currentUser.userType === 'seeker' ? data.bookings : data.spaces;

        // Hide loading
        historyLoading.style.display = 'none';

        if (items.length === 0) {
            historyEmpty.style.display = 'block';
            return;
        }

        // Render history items
        if (currentUser.userType === 'seeker') {
            renderBookings(items);
        } else {
            renderSpaces(items);
        }

    } catch (error) {
        console.error('History load error:', error);
        historyLoading.style.display = 'none';
        showError('Failed to load history data');
    }
}

function renderBookings(bookings) {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';

    bookings.forEach(booking => {
        const li = document.createElement('li');
        li.className = 'history-item';

        const statusClass = getStatusClass(booking.BookingStatus);

        li.innerHTML = `
            <div class="history-item-header">
                <h3 class="history-item-title">${escapeHtml(booking.SpaceTitle)}</h3>
                <span class="history-item-badge ${statusClass}">${booking.BookingStatus}</span>
            </div>
            <div class="history-item-details">
                <p><i class="fa-solid fa-location-dot"></i> ${escapeHtml(booking.City || 'N/A')}, ${escapeHtml(booking.AddressLine1 || '')}</p>
                <p><i class="fa-solid fa-calendar"></i> ${formatDate(booking.StartDate)} - ${formatDate(booking.EndDate)}</p>
                <p><i class="fa-solid fa-user"></i> Provider: ${escapeHtml(booking.ProviderName)}</p>
                <p><i class="fa-solid fa-box"></i> Type: ${escapeHtml(booking.SpaceType)} | Size: ${booking.Size} m²</p>
            </div>
            <div class="history-item-footer">
                <span class="history-item-date">Booked: ${formatDate(booking.CreatedAt)}</span><br>
                <span class="history-item-price">${formatPriceWithCurrency(booking.TotalAmount.toFixed(2))}</span>
            </div>
        `;

        historyList.appendChild(li);
    });
}

function renderSpaces(spaces) {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';

    spaces.forEach(space => {
        const li = document.createElement('li');
        li.className = 'history-item';

        const statusClass = getStatusClass(space.Status);

        li.innerHTML = `
            <div class="history-item-header">
                <h3 class="history-item-title">${escapeHtml(space.Title)}</h3>
                <span class="history-item-badge ${statusClass}">${space.Status}</span>
            </div>
            <div class="history-item-details">
                <p><i class="fa-solid fa-location-dot"></i> ${escapeHtml(space.City || 'N/A')}, ${escapeHtml(space.AddressLine1 || '')}</p>
                <p><i class="fa-solid fa-box"></i> Type: ${escapeHtml(space.SpaceType)} | Size: ${space.Size} m²</p>
                <p><i class="fa-solid fa-heart"></i> ${space.FavoriteCount} favorites | ${space.TotalBookings} total bookings</p>
                <p><i class="fa-solid fa-check-circle"></i> Available: ${space.IsAvailable ? 'Yes' : 'No'} | Active Bookings: ${space.ActiveBookings}</p>
            </div>
            <div class="history-item-footer">
                <span class="history-item-price">${formatPriceWithCurrency(space.PricePerMonth.toFixed(2))}</span>
                <span class="history-item-date">Listed: ${formatDate(space.CreatedAt)}</span>
            </div>
        `;

        historyList.appendChild(li);
    });
}

// =============================================
// STATISTICS MANAGEMENT
// =============================================

async function loadStatistics() {
    try {
        let response;
        if (currentUser.userType === 'seeker') {
            response = await fetch(
                `${API_BASE_URL}/seeker/${currentUser.id}/statistics`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('siaaToken')}`
                    }
                }
            );
        } else {
            response = await fetch(
                `${API_BASE_URL}/provider/${currentUser.id}/statistics`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('siaaToken')}`
                    }
                }
            );
        }

        if (!response.ok) {
            throw new Error('Failed to load statistics');
        }

        const data = await response.json();
        const stats = data.statistics;

        // Update statistics display
        if (currentUser.userType === 'seeker') {
            document.getElementById('statTotal').textContent = stats.TotalBookings || 0;
            document.getElementById('statActive').textContent = stats.ActiveBookings || 0;
            document.getElementById('statPending').textContent = stats.PendingBookings || 0;
            document.getElementById('statRevenue').textContent =
                formatPriceWithCurrency(stats.TotalSpent || 0);
        } else {
            document.getElementById('statTotal').textContent = stats.TotalSpaces || 0;
            document.getElementById('statActive').textContent = stats.ActiveSpaces || 0;
            document.getElementById('statPending').textContent = stats.PendingSpaces || 0;
            document.getElementById('statRevenue').textContent = formatPriceWithCurrency(stats.TotalRevenue) || 0;
        }

    } catch (error) {
        console.error('Statistics load error:', error);
        showError('Failed to load statistics');
    }
}

// =============================================
// EVENT LISTENERS
// =============================================

function setupEventListeners() {
    // Sidebar navigation
    const sidebarLinks = document.querySelectorAll('.sideBar-link');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', handleSidebarNavigation);
    });

    // Logout
    const logoutLink = document.querySelector('.logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    // Profile edit/save
    const editBtn = document.getElementById('editProfileBtn');
    const saveBtn = document.getElementById('saveProfileBtn');
    const profileForm = document.getElementById('profileForm');

    if (editBtn) {
        editBtn.addEventListener('click', () => {
            enableProfileEditing();
        });
    }

    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleProfileSave();
        });
    }
}

function handleSidebarNavigation(e) {
    e.preventDefault();

    const targetSection = this.getAttribute('data-section');

    if (!targetSection) return;

    // Remove active class from all links and sections
    document.querySelectorAll('.sideBar-link').forEach(link => {
        link.classList.remove('is-active');
    });
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('is-active');
    });

    // Add active class to clicked link and target section
    this.classList.add('is-active');
    const section = document.getElementById(targetSection);
    if (section) {
        section.classList.add('is-active');
    }
}

function enableProfileEditing() {
    const inputs = document.querySelectorAll('#profileForm .form-input:not(#profileEmail):not(#profileRole):not(#profileStatus)');
    inputs.forEach(input => {
        input.disabled = false;
    });

    document.getElementById('editProfileBtn').disabled = true;
    document.getElementById('saveProfileBtn').disabled = false;
}

async function handleProfileSave() {
    const formData = {
        firstName: document.getElementById('profileFirstName').value,
        lastName: document.getElementById('profileLastName').value,
        phoneNumber: document.getElementById('profilePhone').value
    };

    await updateProfile(formData);

    // Disable editing
    const inputs = document.querySelectorAll('#profileForm .form-input');
    inputs.forEach(input => {
        input.disabled = true;
    });

    document.getElementById('editProfileBtn').disabled = false;
    document.getElementById('saveProfileBtn').disabled = true;
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

function getStatusClass(status) {
    const statusMap = {
        'Active': 'status-active',
        'Pending': 'status-pending',
        'Completed': 'status-completed',
        'Cancelled': 'status-cancelled',
        'Confirmed': 'status-active',
        'Rejected': 'status-cancelled',
        'Inactive': 'status-cancelled',
        'UnderReview': 'status-pending'
    };
    return statusMap[status] || 'status-default';
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function showError(message) {
    // Simple alert for now - can be replaced with a toast notification
    alert('Error: ' + message);
}

function showSuccess(message) {
    // Simple alert for now - can be replaced with a toast notification
    alert('Success: ' + message);
}

// =============================================
// EXPORT FOR TESTING
// =============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        checkAuthentication,
        loadProfile,
        loadHistory,
        loadStatistics
    };
}