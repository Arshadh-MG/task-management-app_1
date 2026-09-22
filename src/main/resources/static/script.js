document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS SELECTION ---
    const body = document.body;
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const sunIcon = themeToggleBtn?.querySelector('.sun-icon');
    const moonIcon = themeToggleBtn?.querySelector('.moon-icon');

    const loginCard = document.getElementById('loginCard');
    const registerCard = document.getElementById('registerCard');
    
    const goToRegister = document.getElementById('goToRegister');
    const goToLogin = document.getElementById('goToLogin');

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    const alertBox = document.getElementById('alertBox');
    const alertMessage = alertBox?.querySelector('.alert-message');
    const alertIcon = alertBox?.querySelector('.alert-icon');

    // --- STATE MANAGER ---
    const state = {
        theme: localStorage.getItem('lms_portal_theme') || 'light',
        submitting: false
    };

    // --- INITIALIZATION ---
    applyTheme(state.theme);
    setupPasswordToggles();
    if (registerForm) registerForm.reset();
    if (loginForm) loginForm.reset();
    setTimeout(() => {
        if (registerForm) registerForm.reset();
        if (loginForm) loginForm.reset();
    }, 100);

    // --- THEME MANAGEMENT ---
    themeToggleBtn?.addEventListener('click', () => {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('lms_portal_theme', state.theme);
        applyTheme(state.theme);
    });

    function applyTheme(theme) {
        if (theme === 'dark') {
            body.classList.remove('light-theme');
            body.classList.add('dark-theme');
            sunIcon && (sunIcon.style.display = 'block');
            moonIcon && (moonIcon.style.display = 'none');
        } else {
            body.classList.add('light-theme');
            body.classList.remove('dark-theme');
            sunIcon && (sunIcon.style.display = 'none');
            moonIcon && (moonIcon.style.display = 'block');
        }
    }

    // --- FORM SWITCHING ---
    goToRegister?.addEventListener('click', () => {
        switchForm('register');
    });

    goToLogin?.addEventListener('click', () => {
        switchForm('login');
    });

    function switchForm(formName) {
        if (!loginCard || !registerCard) return;
        clearAlerts();
        clearValidationMessages();
        
        if (formName === 'register') {
            loginCard.classList.remove('active');
            setTimeout(() => {
                loginCard.classList.add('hidden');
                registerCard.classList.remove('hidden');
                setTimeout(() => registerCard.classList.add('active'), 50);
            }, 300);
        } else {
            registerCard.classList.remove('active');
            setTimeout(() => {
                registerCard.classList.add('hidden');
                loginCard.classList.remove('hidden');
                setTimeout(() => loginCard.classList.add('active'), 50);
            }, 300);
        }
    }

    // --- PASSWORD VISIBILITY TOGGLE ---
    function setupPasswordToggles() {
        const toggleButtons = document.querySelectorAll('.password-toggle');
        toggleButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const input = btn.previousElementSibling;
                const eyeOpen = btn.querySelector('.eye-open');
                const eyeClosed = btn.querySelector('.eye-closed');

                if (input.type === 'password') {
                    input.type = 'text';
                    eyeOpen.classList.add('hidden');
                    eyeClosed.classList.remove('hidden');
                } else {
                    input.type = 'password';
                    eyeOpen.classList.remove('hidden');
                    eyeClosed.classList.add('hidden');
                }
            });
        });
    }

    // --- VALIDATION LOGIC ---
    const validators = {
        name: (val) => {
            if (!val.trim()) return 'Full name is required';
            if (val.trim().length < 2) return 'Full name must be at least 2 characters';
            return null;
        },
        email: (val) => {
            if (!val) return 'Email address is required';
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(val)) return 'Please enter a valid email address';
            return null;
        },
        role: (val) => {
            if (!val.trim()) return 'Account role is required';
            return null;
        },
        password: (val) => {
            if (!val) return 'Password is required';
            if (val.length < 4) return 'Password must be at least 4 characters long';
            return null;
        },
        confirmPassword: (val, pwd) => {
            if (!val) return 'Confirm password is required';
            if (val !== pwd) return 'Passwords do not match';
            return null;
        }
    };

    // --- ALERT NOTIFICATIONS MANAGEMENT ---
    function showAlert(type, message) {
        if (!alertBox) return;
        alertBox.className = `alert-container ${type}`;
        alertMessage.textContent = message;
        
        // Render appropriate inline status icons
        if (type === 'success') {
            alertIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
        } else {
            alertIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
        }
        
        alertBox.classList.remove('hidden');
        
        // Auto scroll to top of form panel to view alert on mobile
        document.querySelector('.form-panel, body > .form-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function clearAlerts() {
        if (!alertBox) return;
        alertBox.classList.add('hidden');
        alertBox.className = 'alert-container hidden';
        alertMessage.textContent = '';
        alertIcon.innerHTML = '';
    }

    function clearValidationMessages() {
        const errorSpans = document.querySelectorAll('.validation-message');
        errorSpans.forEach(span => span.textContent = '');
    }

    // --- FORM SUBMISSIONS HANDLERS ---

    // A. LOGIN SUBMISSION
    loginForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        if (state.submitting) return;

        clearAlerts();

        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');

        const emailError = validators.email(emailInput.value);
        const passwordError = validators.password(passwordInput.value);

        document.getElementById('loginEmailError').textContent = emailError || '';
        document.getElementById('loginPasswordError').textContent = passwordError || '';

        if (emailError || passwordError) {
            // Focus on first input with error
            if (emailError) emailInput.focus();
            else if (passwordError) passwordInput.focus();
            return;
        }

        // Real Login via Backend API
        toggleSubmitState(loginForm, true, 'loginSubmitBtn');
        
        fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: emailInput.value.trim(),
                password: passwordInput.value
            })
        })
            .then(async response => {
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Sign-in failed.');
                return result;
            })
            .then(result => {
                showAlert('success', 'Sign-in successful! Redirecting to calendar dashboard...');
                
                localStorage.setItem('token', 'simulated_jwt_token_key');
                localStorage.setItem('user', JSON.stringify({
                    userId: result.user.id,
                    fullName: result.user.fullName,
                    email: result.user.email,
                    role: result.user.role
                }));
                
                // Redirect to calendar dashboard
                setTimeout(() => {
                    window.location.href = './calendar.html';
                }, 1200);
            })
            .catch(error => {
                showAlert('danger', error.message || 'Invalid credentials.');
            })
            .finally(() => {
                toggleSubmitState(loginForm, false, 'loginSubmitBtn');
            });
    });

    // B. REGISTER SUBMISSION
    registerForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        if (state.submitting) return;

        clearAlerts();

        const nameInput = document.getElementById('registerName');
        const emailInput = document.getElementById('registerEmail');
        const roleInput = document.getElementById('registerRole');
        const passwordInput = document.getElementById('registerPassword');
        const confirmPasswordInput = document.getElementById('registerConfirmPassword');

        // Verify all validations
        const nameError = validators.name(nameInput.value);
        const emailError = validators.email(emailInput.value);
        const roleError = validators.role(roleInput.value);
        const passwordError = validators.password(passwordInput.value);
        const confirmPasswordError = validators.confirmPassword(confirmPasswordInput.value, passwordInput.value);

        document.getElementById('registerNameError').textContent = nameError || '';
        document.getElementById('registerEmailError').textContent = emailError || '';
        document.getElementById('registerRoleError').textContent = roleError || '';
        document.getElementById('registerPasswordError').textContent = passwordError || '';
        document.getElementById('registerConfirmPasswordError').textContent = confirmPasswordError || '';

        if (nameError || emailError || roleError || passwordError || confirmPasswordError) {
            if (nameError) nameInput.focus();
            else if (emailError) emailInput.focus();
            else if (roleError) roleInput.focus();
            else if (passwordError) passwordInput.focus();
            else if (confirmPasswordError) confirmPasswordInput.focus();
            return;
        }

        toggleSubmitState(registerForm, true, 'registerSubmitBtn');

        fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: nameInput.value.trim(),
                email: emailInput.value.trim(),
                role: roleInput.value.trim(),
                password: passwordInput.value
            })
        })
            .then(async response => {
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Registration failed.');
                return result;
            })
            .then(result => {
                showAlert('success', `${result.message} Redirecting to login...`);
                registerForm.reset();
                setTimeout(() => {
                    window.location.href = './index.html';
                }, 1500);
            })
            .catch(error => {
                showAlert('danger', error.message);
            })
            .finally(() => {
                toggleSubmitState(registerForm, false, 'registerSubmitBtn');
            });
    });

    // Toggle button spinner logic
    function toggleSubmitState(form, isSubmitting, btnId) {
        state.submitting = isSubmitting;
        const btn = document.getElementById(btnId);
        const loader = btn.querySelector('.loader');
        const text = btn.querySelector('.btn-text');

        // Disable input fields
        const inputs = form.querySelectorAll('input, select, button');
        inputs.forEach(el => {
            if (el.id !== btnId) el.disabled = isSubmitting;
        });

        if (isSubmitting) {
            btn.disabled = true;
            loader.classList.remove('hidden');
            text.style.opacity = '0.5';
        } else {
            btn.disabled = false;
            loader.classList.add('hidden');
            text.style.opacity = '1';
        }
    }
});
