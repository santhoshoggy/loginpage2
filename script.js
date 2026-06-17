function showError(id, msg) {
  var el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove('hidden');
}
function hideMsg(id) {
  document.getElementById(id).classList.add('hidden');
}

// ---- LOGIN PAGE ----
var loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    hideMsg('error-msg');
    hideMsg('success-msg');

    var username = document.getElementById('username').value.trim();
    var password = document.getElementById('password').value.trim();

    var res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password })
    });
    var data = await res.json();

    if (data.success) {
      var successEl = document.getElementById('success-msg');
      successEl.textContent = 'Login successful! Welcome, ' + username + '!';
      successEl.classList.remove('hidden');
      loginForm.reset();
    } else {
      showError('error-msg', data.message);
    }
  });
}

// ---- REGISTER PAGE ----
var registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    hideMsg('error-msg');

    var username = document.getElementById('username').value.trim();
    var password = document.getElementById('password').value.trim();
    var email    = document.getElementById('email').value.trim();
    var phone    = document.getElementById('phone').value.trim();

    if (!/^\d{10}$/.test(phone)) {
      showError('error-msg', 'Enter a valid 10-digit mobile number.');
      return;
    }

    var res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password, email: email, phone: phone })
    });
    var data = await res.json();

    if (data.success) {
      sessionStorage.setItem('pendingUser', username);
      sessionStorage.setItem('otpFlow', 'register');
      window.location.href = 'otp.html';
    } else {
      showError('error-msg', data.message);
    }
  });
}

// ---- OTP PAGE ----
var otpForm = document.getElementById('otp-form');
if (otpForm) {
  var pendingUser = sessionStorage.getItem('pendingUser');
  var otpFlow     = sessionStorage.getItem('otpFlow');

  // Set back link
  var backLink = document.getElementById('back-link');
  if (otpFlow === 'register') {
    backLink.innerHTML = '<a href="register.html">← Back to Register</a>';
  } else {
    backLink.innerHTML = '<a href="index.html">← Back to Login</a>';
  }

  if (!pendingUser) {
    window.location.href = 'index.html';
  }

  otpForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    hideMsg('error-msg');
    hideMsg('success-msg');

    var otp = document.getElementById('otp').value.trim();

    var endpoint = otpFlow === 'register' ? '/api/verify-register-otp' : '/api/verify-otp';

    var res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: pendingUser, otp: otp })
    });
    var data = await res.json();

    if (data.success) {
      sessionStorage.removeItem('pendingUser');
      sessionStorage.removeItem('otpFlow');

      if (otpFlow === 'register') {
        alert('Registration complete! Please login.');
        window.location.href = 'index.html';
      } else {
        sessionStorage.setItem('loggedInUser', pendingUser);
        window.location.href = 'dashboard.html';
      }
    } else {
      showError('error-msg', data.message);
    }
  });
}
