let email = "";
async function sendEmail() {
  email = document.getElementById("email").value.trim();

  const otpSent = await sendOTP(email);
  if (otpSent) {
    document.getElementById("forgot").classList.add("active");
    document.getElementById("check-email").classList.add("active");
    document.getElementById("otp-email").textContent = email;
  } else {
    alert("Failed to send OTP. Please try again.");
    return;
  }
}

function sendOTP(userEmail) {
  return fetch("api/send_otp.php", {
    method: "POST",
    body: new URLSearchParams({ 
      email: userEmail,
      action: "change"
     })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      console.log("OTP sent successfully!");
      return true;
    } else {
      console.error("Failed to send OTP:", data.error);
      return false;
    }
  })
  .catch(err => {
    console.error("Error sending OTP:", err);
    return false;
  });
}


function verifyOTP() {
  const otp = document.getElementById("otp-input").value;

  fetch("api/verify_otp.php", {
    method: "POST",
    body: new URLSearchParams({ otp })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      document.getElementById("enter-pass").classList.add("active");
      document.getElementById("check-email").classList.remove("active");
      return true;
    } else {
      alert(data.message);
      return false;
    }
  });
}

function changePass() {
  let pass = document.getElementById("otp-pass-input").value.trim();
  let confirmPass = document.getElementById("otp-confirm-input").value.trim();

  if (pass !== confirmPass) {
    showError("Password does not match!");
    return;
  }
  if (pass.length < 6) {
    showError("Password must be at least 6 characters!");
    return;
  }

  fetch("api/auth.php", {
    method: "POST",
    body: new URLSearchParams({
      action: "changePass",
      email,
      pass,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        alert("Password Changed Successfully");
        window.location.href = "login.html";
      } else {
        showError(data.message);
        window.location.href = "signup.html";
      }
    });
}