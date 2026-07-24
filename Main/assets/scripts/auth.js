// ─── LOGIN ────────────────────────────────────────────────
function handleLogin() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  const recaptchaResponse = grecaptcha.getResponse();
  if (!recaptchaResponse) {
    showError("Please complete the reCAPTCHA!");
    return;
  }

  if (!email || !password) {
    showError("Please fill in all fields!");
    return;
  }

  fetch("api/auth.php", {
    method: "POST",
    body: new URLSearchParams({
      action: "login",
      email,
      password,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        // save to localStorage so other pages know who's logged in
        localStorage.setItem("user_name", data.name);
        localStorage.setItem("user_id", data.id);
        localStorage.setItem("user_phone", data.phone);
        localStorage.setItem("user_address", data.address);
        localStorage.setItem("user_city", data.city);
        localStorage.setItem("user_role", data.role);
        localStorage.setItem("user_email", email);
        window.location.href = "mainpage.html";
      } else {
        showError(data.message);
      }
    });
}

// ─── ADMIN LOGIN ──────────────────────────────────────────
function handleAdminLogin() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    showError("Please fill in all fields!");
    return;
  }

  const recaptchaResponse = grecaptcha.getResponse();
  if (!recaptchaResponse) {
    showError("Please complete the reCAPTCHA!");
    return;
  }

  fetch("api/auth.php", {
    method: "POST",
    body: new URLSearchParams({
      action: "login",
      email,
      password,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success && data.role === "admin") {
        localStorage.setItem("user_name", data.name);
        localStorage.setItem("user_id", data.id);
        localStorage.setItem("user_phone", data.phone);
        localStorage.setItem("user_address", data.address);
        localStorage.setItem("user_city", data.city);
        localStorage.setItem("user_role", data.role);
        localStorage.setItem("user_email", email);

        window.location.href = "adminPage.html";
      } else if (data.success && data.role !== "admin") {
        showError("Access denied. Admins only.");
      } else {
        showError(data.message);
      }
    });
}

// ─── SIGNUP ───────────────────────────────────────────────
async function handleSignup() {
  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const confirm = document.getElementById("confirm-password").value.trim();
  const address = document.getElementById("address").value.trim();
  const city = document.getElementById("city").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const terms = document.getElementById("terms");

  if (
    !firstName ||
    !lastName ||
    !email ||
    !password ||
    !confirm ||
    !terms.checked ||
    !address ||
    !city ||
    !phone
  ) {
    showError("Please fill in all fields!");
    return;
  }

  if (password !== confirm) {
    showError("Passwords do not match!");
    return;
  }

  const emailCheck = await fetch("api/auth.php", {
    method: "POST",
    body: new URLSearchParams({
      action: "email",
      email,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        alert(data.message);
        return;
      }
    });

  if (password.length < 6) {
    showError("Password must be at least 6 characters!");
    return;
  }

  alert("An OTP will be sent in your email please be patient");
  const otpSent = await sendOTP(email);
  if (otpSent) {
    document.getElementById("signup-card").classList.add("active");
    document.getElementById("otp-card").classList.add("active");
    document.getElementById("otp-email").textContent = email;
  } else {
    alert("Failed to send OTP. Please try again.");
    return;
  }

  document.getElementById("resend").addEventListener("click", () => sendOTP(email));
}

// ─── SEND OTP FUNCTION ─────────────────────────────
function sendOTP(userEmail) {
  return fetch("api/send_otp.php", {
    method: "POST",
    action: "",
    body: new URLSearchParams({ email: userEmail }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        console.log("OTP sent successfully!");
        return true;
      } else {
        console.error("Failed to send OTP:", data.error);
        return false;
      }
    })
    .catch((err) => {
      console.error("Error sending OTP:", err);
      return false;
    });
}

// ─── VERIFY OTP FUNCTION ─────────────────────────────
function verifyOTP() {
  const otp = document.getElementById("otp-input").value;

  fetch("api/verify_otp.php", {
    method: "POST",
    body: new URLSearchParams({ otp }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        alert("Verified!");
        storeAccount();
        return true;
      } else {
        alert(data.message);
        return false;
      }
    });
}

function storeAccount() {
  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const name = firstName + " " + lastName;
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const address = document.getElementById("address").value.trim();
  const city = document.getElementById("city").value.trim();
  const phone = document.getElementById("phone").value.trim();

  return fetch("api/auth.php", {
    method: "POST",
    body: new URLSearchParams({
      action: "signup",
      name,
      email,
      password,
      address,
      city,
      phone,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        alert("Account created! Please login.");
        window.location.href = "login.html";
      } else {
        showError(data.message);
        window.location.href = "signup.html";
      }
    });
}

// ─── LOGOUT ───────────────────────────────────────────────
function handleLogout() {
  fetch("api/auth.php", {
    method: "POST",
    body: new URLSearchParams({ action: "logout" }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        localStorage.clear();
        window.location.href = "login.html";
      }
    });
}

// ─── SHOW ERROR MESSAGE ───────────────────────────────────
function showError(message) {
  const errorDiv = document.getElementById("error-message");
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = "block";
  } else {
    alert(message);
  }
}

// ─── UPDATE NAVBAR (show name if logged in) ───────────────
function updateNavbar() {
  const id = localStorage.getItem("user_id");
  const name = localStorage.getItem("user_name");
  const role = localStorage.getItem("user_role");
  const userNameEl = document.getElementById("user-name");
  const container = document.getElementById("logout");
  const linkName = document.createElement("a");
  if (role != "admin") {
    const cart = document.createElement("a");
    cart.innerHTML = "<i class='fa-solid fa-cart-shopping header-icon'></i>";
    cart.href = "cart.html";
    container.appendChild(cart);
  }
  if (name && userNameEl && id) {
    userNameEl.innerHTML = "";
    linkName.innerHTML = name;
    if (role != "admin") {
      linkName.href = "profile.html";
    }
    const logout = document.createElement("a");
    logout.innerHTML =
      "<i class='fa-solid fa-right-from-bracket header-icon'></i>";
    container.appendChild(linkName);
    container.appendChild(logout);
    logout.addEventListener("click", () => {
      if (confirm("Are you sure you want to logout?")) handleLogout();
    });
  }
}

updateNavbar();
