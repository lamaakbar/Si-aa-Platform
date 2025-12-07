document.addEventListener('DOMContentLoaded', function () {
    const userRole = 'provider'; 

    const sideBarLinks = document.querySelectorAll('.sideBar-link');
    const sections = document.querySelectorAll('.dashboard-section');

    const userNameDisplay = document.getElementById('userNameDisplay');
    const actionButton = document.getElementById('actionButton');

    const historyTitle = document.getElementById('historyTitle');
    const historyList = document.getElementById('historyList');
    const historyEmptyMessage = document.getElementById('historyEmptyMessage');

    const profileForm = document.getElementById('profileForm');
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profilePhone = document.getElementById('profilePhone');
    const profileRole = document.getElementById('profileRole');
    const editProfileBtn = document.getElementById('editProfileBtn');
    const saveProfileBtn = document.getElementById('saveProfileBtn');

    /* --------- SAMPLE DATA --------- */
    const providerSpaces = [
        {
            title: 'Basement Storage - North Jeddah',
            size: '12 m²',
            status: 'Active',
            since: '2025-01-04'
        },
        {
            title: 'Parking Slot - Al Hamra',
            size: '8 m²',
            status: 'Booked',
            since: '2025-02-10'
        }
    ];

    const seekerBookings = [
        {
            title: 'Locker Space - King\'s Road',
            size: '3 m²',
            status: 'Ongoing',
            from: '2025-01-20',
            to: '2025-03-20'
        },
        {
            title: 'Garage Storage - South Jeddah',
            size: '10 m²',
            status: 'Completed',
            from: '2024-09-01',
            to: '2024-12-01'
        }
    ];

    function initRoleUI() {
        if (userRole === 'provider') {
            profileRole.value = 'Space Provider';
            actionButton.textContent = '+ List New Space';
            historyTitle.textContent = 'Your Listed Spaces';
        } else {
            profileRole.value = 'Space Seeker';
            actionButton.textContent = '+ Rent a New Space';
            historyTitle.textContent = 'Your Booked Spaces';
        }
    }

    sideBarLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();

            const targetSectionId = this.dataset.section;

            // update active link
            sideBarLinks.forEach(l => l.classList.remove('is-active'));
            this.classList.add('is-active');

            // show / hide sections
            sections.forEach(section => {
                if (section.id === targetSectionId) {
                    section.classList.add('is-active');
                } else {
                    section.classList.remove('is-active');
                }
            });
        });
    });

    function renderHistory() {
        let items = userRole === 'provider' ? providerSpaces : seekerBookings;

        historyList.innerHTML = '';

        if (!items || items.length === 0) {
            historyEmptyMessage.style.display = 'block';
            return;
        } else {
            historyEmptyMessage.style.display = 'none';
        }

        items.forEach(item => {
            const li = document.createElement('li');
            li.className = 'history-item';

            if (userRole === 'provider') {
                li.innerHTML = `
                    <div class="history-main">
                        <h3 class="history-title">${item.title}</h3>
                        <p class="history-meta">Size: ${item.size}</p>
                    </div>
                    <div class="history-status-box">
                        <span class="history-status">${item.status}</span>
                        <span class="history-date">Listed since: ${item.since}</span>
                    </div>
                `;
            } else {
                li.innerHTML = `
                    <div class="history-main">
                        <h3 class="history-title">${item.title}</h3>
                        <p class="history-meta">Size: ${item.size}</p>
                    </div>
                    <div class="history-status-box">
                        <span class="history-status">${item.status}</span>
                        <span class="history-date">From ${item.from} to ${item.to}</span>
                    </div>
                `;
            }

            historyList.appendChild(li);
        });
    }

    function setProfileEditable(isEditable) {
        [profileName, profileEmail, profilePhone].forEach(input => {
            input.disabled = !isEditable;
        });

        saveProfileBtn.disabled = !isEditable;

        if (isEditable) {
            editProfileBtn.textContent = 'Cancel';
        } else {
            editProfileBtn.textContent = 'Edit';
        }
    }

    editProfileBtn.addEventListener('click', function () {
        const isCurrentlyEditable = !profileName.disabled;
        setProfileEditable(!isCurrentlyEditable);

        // if user clicked cancel, reset to stored values
        if (isCurrentlyEditable) {
            const stored = JSON.parse(localStorage.getItem('siaaProfile') || '{}');
            if (stored.name) profileName.value = stored.name;
            if (stored.email) profileEmail.value = stored.email;
            if (stored.phone) profilePhone.value = stored.phone;
        }
    });

    profileForm.addEventListener('submit', function (e) {
        e.preventDefault();

        if (!profileName.value.trim() || !profileEmail.value.trim()) {
            alert('Please fill in at least your name and email.');
            return;
        }

        const profileData = {
            name: profileName.value.trim(),
            email: profileEmail.value.trim(),
            phone: profilePhone.value.trim()
        };

        localStorage.setItem('siaaProfile', JSON.stringify(profileData));

        // update header name
        userNameDisplay.textContent = profileData.name || 'User';

        setProfileEditable(false);
        alert('Profile saved successfully.');
    });

    actionButton.addEventListener('click', function () {
        if (userRole === 'provider') {
            // redirect to your "list space" page
            window.location.href = 'listSpace.html';
        } else {
            // redirect to your "search / rent space" page
            window.location.href = 'search.html';
        }
    });

    function loadStoredProfile() {
        const stored = JSON.parse(localStorage.getItem('siaaProfile') || '{}');
        if (stored.name) {
            profileName.value = stored.name;
            userNameDisplay.textContent = stored.name;
        }
        if (stored.email) profileEmail.value = stored.email;
        if (stored.phone) profilePhone.value = stored.phone;
    }

    initRoleUI();
    loadStoredProfile();
    renderHistory();
    setProfileEditable(false); 
});