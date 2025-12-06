function showError(input, msg) {
    const group = input.closest(".form-group");
    if (!group) return;

    clearError(input);

    const p = document.createElement("p");
    p.classList.add("error-msg");
    p.textContent = msg;
    group.appendChild(p);
  }

  function clearError(input) {
    const group = input.closest(".form-group");
    if (!group) return;

    const msg = group.querySelector(".error-msg");
    if (msg) msg.remove();
  }

  function isMobile(input, messages) {
    clearError(input);
    const value = input.value.trim();

    if (!value.match(/^[0-9]{9}$/)) {
      messages.push(["phone", "Phone number must be 9 digits (e.g. 5XXXXXXXX)."]);
    }
    return messages;
  }

  function isFilled(input, messages, msg) {
    clearError(input);
    if (input.value.trim().length < 1) {
      messages.push([input.name, msg]);
    }
    return messages;
  }

  function isEmail(input, messages) {
    clearError(input);
    const value = input.value.trim();
    const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!pattern.test(value)) {
      messages.push(["email", "Please enter a valid email address."]);
    }
    return messages;
  }

  function isPassword(passInput, confirmInput, messages) {
    clearError(passInput);
    clearError(confirmInput);

    const pass = passInput.value.trim();
    const confirm = confirmInput.value.trim();

    if (pass.length < 8) {
      messages.push(["password", "Password must be at least 8 characters."]);
    }

    if (pass !== confirm) {
      messages.push(["confirmPassword", "Password and Confirm Password do not match."]);
    }

    return messages;
  }

  document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector(".auth-form");

    if (!form) return;

    form.addEventListener("submit", function (e) {
      let messages = [];

      const fullName = document.getElementsByName("fullName")[0];
      const email = document.getElementsByName("email")[0];
      const phone = document.getElementsByName("phone")[0];
      const password = document.getElementsByName("password")[0];
      const confirmPassword = document.getElementsByName("confirmPassword")[0];
      const terms = document.getElementsByName("terms")[0];

      [fullName, email, phone, password, confirmPassword].forEach(clearError);

      messages = isFilled(fullName, messages, "Full name is required.");
      messages = isEmail(email, messages);
      messages = isMobile(phone, messages);
      messages = isPassword(password, confirmPassword, messages);

      const termsGroup = terms.closest(".form-group");
      const oldTermsError = termsGroup.querySelector(".error-msg");
      if (oldTermsError) oldTermsError.remove();

      if (!terms.checked) {
        messages.push(["terms", "You must agree to the Terms & Privacy Policy."]);
      }

      if (messages.length > 0) {
        e.preventDefault();

        messages.forEach(([fieldName, msg]) => {
          const input = document.getElementsByName(fieldName)[0];
          if (input) showError(input, msg);
        });
      }
    });
  });