/* 1. UTILITIES */
const Utils = {
    isValidDLSUEmail(email) {
        return /^[^\s@]+@dlsu\.edu(\.ph)?$/.test(email);
    },
    passwordStrength(pw) {
        let score = 0;
        if (pw.length >= 8) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;
        return score; // 0-4
    },
    toast(message, type = 'success') {
        const existing = document.querySelector('.toast-notification');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.innerHTML = `<span>${type === 'success' ? '✔' : '✖'}</span> ${message}`;
        toast.style.cssText = `
            position:fixed; bottom:24px; right:24px; z-index:9999;
            background:${type === 'success' ? '#006B3F' : '#dc2626'};
            color:white; padding:12px 20px; border-radius:12px;
            font-size:14px; font-family:Inter,sans-serif;
            box-shadow:0 8px 24px rgba(0,0,0,0.2);
            animation: slideInToast 0.3s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
};

/* 2. AUTH & NAVBAR UI */
const AuthUI = {
    injectNavbar(role) {
        if (document.querySelector('.app-navbar')) return;

        const nav = document.createElement('nav');
        nav.className = 'app-navbar';
        const isTech = role === 'technician';

        nav.innerHTML = `
        <div class="nav-inner" style="background:#006B3F; padding: 15px 20px; color: white; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <a href="${isTech ? '/tech-dashboard' : '/student-dashboard'}" style="color:white; text-decoration:none; font-weight:bold; font-size:18px;">
                AnimoLabs
            </a>
            <div class="nav-links" style="display:flex; gap:15px; font-family: Inter, sans-serif; font-size: 14px;">
                ${isTech ? `
                    <a href="/tech-dashboard" style="color:white; text-decoration:none;">Dashboard</a>
                    <a href="/manage-reservations" style="color:white; text-decoration:none;">Manage</a>
                    <a href="/all-reservations" style="color:white; text-decoration:none;">All Reservations</a>
                ` : `
                    <a href="/student-dashboard" style="color:white; text-decoration:none;">Dashboard</a>
                    <a href="/view-slots" style="color:white; text-decoration:none;">Book a Seat</a>
                    <a href="/my-reservations" style="color:white; text-decoration:none;">My Reservations</a>
                    <a href="/search" style="color:white; text-decoration:none;">Search Slots</a>
                `}
                <a href="/" style="color:#ffcccc; text-decoration:none; margin-left: 20px; border: 1px solid #ffcccc; padding: 2px 10px; border-radius: 5px;">Logout</a>
            </div>
        </div>`;
        document.body.prepend(nav);
    }
};

/* 3. PAGE CONTROLLERS */

const RegisterPage = {
    init() {
        const form = document.querySelector('form');
        if (!form) return;

        const pwInput = form.querySelectorAll('input[type="password"]')[0];
        const confirmPwInput = form.querySelectorAll('input[type="password"]')[1];
        const nameInput = form.querySelector('input[type="text"]');
        const emailInput = form.querySelector('input[type="email"]');
        const bars = form.querySelectorAll('.strength-bar div');
        const strengthText = form.querySelector('.strength-text');
        const roleButtons = form.querySelectorAll('.role-btn');
        const roleDesc = form.querySelector('.role-desc');
        let selectedRole = 'student';

        // Role toggle UI
        roleButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                roleButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedRole = btn.textContent.trim().toLowerCase().includes('tech') ? 'technician' : 'student';
                if (roleDesc) roleDesc.textContent = selectedRole === 'technician'
                    ? 'Manage lab reservations and assist walk-in students.'
                    : 'Access lab reservation and personal booking features.';
            });
        });

        // Password strength UI
        if (pwInput && bars.length) {
            pwInput.addEventListener('input', () => {
                const score = Utils.passwordStrength(pwInput.value);
                const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e'];
                const labels = ['Weak', 'Fair', 'Good', 'Strong'];
                bars.forEach((bar, i) => {
                    bar.style.background = i < score ? colors[score - 1] : '#e5e7eb';
                });
                if (strengthText) {
                    strengthText.textContent = pwInput.value ? `Password strength: ${labels[score - 1] || 'Too short'}` : 'Password strength';
                    strengthText.style.color = score >= 3 ? '#22c55e' : score >= 2 ? '#eab308' : '#ef4444';
                }
            });
        }

        // Submit Logic
        const submitBtn = document.querySelector('.submit-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', async (e) => {
                e.preventDefault(); // Stop standard HTML submission to handle it via JS

                const name = nameInput?.value.trim();
                const email = emailInput?.value.trim();
                const pw = pwInput?.value;
                const confirm = confirmPwInput?.value;

                if (!name) return Utils.toast('Please enter your full name.', 'error');
                if (!Utils.isValidDLSUEmail(email)) return Utils.toast('Must use a DLSU email address (@dlsu.edu.ph).', 'error');
                if (pw.length < 8) return Utils.toast('Password must be at least 8 characters.', 'error');
                if (pw !== confirm) return Utils.toast('Passwords do not match.', 'error');

                try {
                    // Send data to server
                    const response = await fetch('/api/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, email, password: pw, role: selectedRole })
                    });

                    if (response.ok) {
                        Utils.toast('Account created! Redirecting to login...', 'success');
                        setTimeout(() => { window.location.href = '/login'; }, 1500);
                    } else {
                        const errorData = await response.json();
                        Utils.toast(errorData.message || 'Registration failed.', 'error');
                    }
                } catch (err) {
                    Utils.toast('Server connection error.', 'error');
                }
            });
        }
    }
};

const StudentDashboard = {
    async init() {
        AuthUI.injectNavbar('student');
        try {
            const response = await fetch('/api/reservations');
            if (response.ok) {
                const reservations = await response.json();
                const upcomingCount = document.querySelector('.stat-card h2');
                if (upcomingCount) upcomingCount.textContent = reservations.length;
            }
        } catch (error) {
            console.log("Could not fetch DB data yet, showing UI layout only.");
        }
    }
};

const TechDashboard = {
    init() {
        AuthUI.injectNavbar('technician');
    }
};

const ViewSlotsPage = {
    init() {
        AuthUI.injectNavbar('student');

        // Make the static seats clickable for visual feedback
        document.querySelectorAll('.seat').forEach(seat => {
            seat.addEventListener('click', function() {
                if (!this.classList.contains('reserved')) {
                    document.querySelectorAll('.seat').forEach(s => s.classList.remove('selected-seat'));
                    this.classList.add('selected-seat');

                    // Show a quick visual confirmation panel update
                    const confirmBtn = document.getElementById('confirm-reserve-btn');
                    if(confirmBtn) {
                        confirmBtn.disabled = false;
                        confirmBtn.style.opacity = '1';
                        confirmBtn.textContent = `Reserve Selected Slots – Seat ${this.textContent}`;
                    }
                }
            });
        });
    }
};

/* 4. ROUTER */
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path.includes('register')) {
        RegisterPage.init();
    } else if (path.includes('student-dashboard')) {
        StudentDashboard.init();
    } else if (path.includes('tech-dashboard')) {
        TechDashboard.init();
    } else if (path.includes('view-slots')) {
        ViewSlotsPage.init();
    } else if (path.includes('my-reservations') || path.includes('search')) {
        AuthUI.injectNavbar('student');
    } else if (path.includes('manage-reservations') || path.includes('all-reservations')) {
        AuthUI.injectNavbar('technician');
    }
});