const stepPanels = Array.from(document.querySelectorAll('.step-panel'));
    const stepPills = Array.from(document.querySelectorAll('.step-pill'));
    const form = document.getElementById('listingForm');
    const confirmationBox = document.getElementById('listingConfirmation');

    function goToStep(stepNumber) {
        stepPanels.forEach(panel => {
            panel.classList.toggle('is-active', Number(panel.dataset.step) === stepNumber);
        });

        stepPills.forEach(pill => {
            const n = Number(pill.dataset.step);
            pill.classList.toggle('is-active', n === stepNumber);
            pill.classList.toggle('is-completed', n < stepNumber);
        });

        if (confirmationBox) confirmationBox.style.display = 'none';
    }

    function showError(container, msg) {
        clearError(container);
        const p = document.createElement("p");
        p.classList.add("error-msg");
        p.textContent = msg;
        container.appendChild(p);
    }

    function clearError(container) {
        if (!container) return;
        const msg = container.querySelector(".error-msg");
        if (msg) msg.remove();
    }

    // STEP 1
    function ValidateStepOne() {
        const title = document.getElementById('listingTitle');
        const neighborhood = document.getElementById('listingNeighborhood');
        const type = document.getElementById('listingType');
        const size = document.getElementById('listingSize');
        const desc = document.getElementById('listingDescription');

        const titleGroup = title.parentElement;
        const neighborhoodGroup = neighborhood.parentElement;
        const typeGroup = type.parentElement;
        const sizeGroup = size.parentElement;
        const descGroup = desc.parentElement;

        [titleGroup, neighborhoodGroup, typeGroup, sizeGroup, descGroup].forEach(clearError);

        if (!title.value.trim()) {
            showError(titleGroup, "Please add a title.");
            return false;
        }
        if (!neighborhood.value) {
            showError(neighborhoodGroup, "Select the neighborhood.");
            return false;
        }
        if (!type.value) {
            showError(typeGroup, "Choose the space type.");
            return false;
        }
        if (!size.value || Number(size.value) <= 0) {
            showError(sizeGroup, "Enter a valid size in m².");
            return false;
        }
        if (desc.value.trim().length < 10) {
            showError(descGroup, "Description must be at least 10 characters.");
            return false;
        }

        goToStep(2);
        return true;
    }

    // STEP 2
    function ValidateStepTwo() {
        const photosInput = document.getElementById('listingPhotos');
        const photosGroup = photosInput.parentElement;

        clearError(photosGroup);

        if (!photosInput.files || photosInput.files.length < 3) {
            showError(photosGroup, "Please upload at least 3 photos of your space.");
            return false;
        }

        goToStep(3);
        return true;
    }

    // STEP 3 
    function ValidateStepThree() {
        const accessRadios = document.querySelectorAll('input[name="accessType"]');
        const price = document.getElementById('listingPrice');
        const duration = document.getElementById('rentalDuration');

        const priceGroup = price.parentElement;
        const durationGroup = duration.parentElement;
        let accessGroup = null;

        if (accessRadios.length > 0) {
            accessGroup = accessRadios[0].closest('.form-group') || accessRadios[0].parentElement;
        }

        [priceGroup, durationGroup, accessGroup].forEach(clearError);

        const accessSelected = document.querySelector('input[name="accessType"]:checked');

        if (!accessSelected) {
            showError(accessGroup, "Choose how people can access the space.");
            return false;
        }

        const priceValue = price.value.trim();

        if (!priceValue || isNaN(priceValue) || Number(priceValue) <= 0) {
            showError(priceGroup, "Enter a valid price in SAR.");
            return false;
        }

        if (!duration.value) {
            showError(durationGroup, "Select a rental duration.");
            return false;
        }

        goToStep(4);
        return true;
    }

    // STEP 4
    function ValidateStepFour() {
        const statusSelected = document.querySelector('input[name="listingStatus"]:checked');
        const firstStatus = document.querySelector('input[name="listingStatus"]');
        let statusGroup = null;

        if (firstStatus) {
            statusGroup = firstStatus.closest('.form-group') || firstStatus.parentElement;
        }

        clearError(statusGroup);

        if (!statusSelected) {
            showError(statusGroup, "Choose listing status (Active or Draft).");
            return false;
        }

        return true;
    }

    // SUBMIT
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        if (!ValidateStepFour()) return;

        if (confirmationBox) {
            confirmationBox.style.display = 'block';
        }
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });

        console.log("Listing is valid and ready to be sent.");
    });