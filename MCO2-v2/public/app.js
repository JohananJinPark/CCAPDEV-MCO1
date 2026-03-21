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
        const form = document.getElementById('registerForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault(); // Stop page from refreshing immediately

            const name = document.getElementById('regName').value.trim();
            const email = document.getElementById('regEmail').value.trim();
            const pw = document.getElementById('regPw').value;
            const confirmPw = document.getElementById('regConfirmPw').value;
            const role = document.getElementById('regRole').value;

            // Basic Validation
            if (!Utils.isValidDLSUEmail(email)) return Utils.toast('Must use a valid @dlsu.edu.ph email.', 'error');
            if (pw.length < 8) return Utils.toast('Password must be at least 8 characters.', 'error');
            if (pw !== confirmPw) return Utils.toast('Passwords do not match.', 'error');

            try {
                // Send to backend
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password: pw, role })
                });

                const data = await response.json();

                if (response.ok) {
                    Utils.toast('Account created! Redirecting to login...', 'success');
                    setTimeout(() => window.location.href = '/login', 1500);
                } else {
                    Utils.toast(data.message || 'Registration failed.', 'error');
                }
            } catch (err) {
                Utils.toast('Server connection error.', 'error');
            }
        });
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

        // Restore seat clicking logic
        document.querySelectorAll('.seat').forEach(seat => {
            seat.addEventListener('click', function() {
                // If it's not already reserved by someone else
                if (!this.classList.contains('reserved')) {
                    // Remove selection from all other seats
                    document.querySelectorAll('.seat').forEach(s => s.classList.remove('selected-seat', 'selected'));

                    // Add selection to clicked seat
                    this.classList.add('selected-seat', 'selected');

                    // Update side panel if it exists
                    const panel = document.querySelector('.seat-panel');
                    if(panel) {
                        panel.innerHTML = `
                            <h3>Seat ${this.textContent} Selected</h3>
                            <button class="confirm-btn" style="background:#006B3F; color:white; padding:10px; border:none; border-radius:8px; width:100%; margin-top:15px; cursor:pointer;">
                                Confirm Reservation
                            </button>
                        `;

                        // Fake confirm button for UI purposes
                        panel.querySelector('.confirm-btn').addEventListener('click', () => {
                            Utils.toast(`Seat ${this.textContent} successfully reserved!`, 'success');
                            this.classList.remove('selected-seat', 'selected');
                            this.classList.add('reserved');
                            panel.innerHTML = `<h3>Select a seat</h3><p>Click any available seat to reserve it.</p>`;
                        });
                    }
                }
            });
        });
    }
};
const SearchPage = {
    init() {
        AuthUI.injectNavbar('student');

        // Restore search button click
        const searchBtn = document.querySelector('.search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                Utils.toast('Searching database for available slots...', 'success');
                // You can add logic here later to fetch specific dates from MongoDB
            });
        }
    }
};

const MyReservationsPage = {
    init() {
        AuthUI.injectNavbar('student');

        // Make edit/cancel buttons functional in UI
        document.querySelectorAll('.cancel').forEach(btn => {
            btn.addEventListener('click', function() {
                if(confirm("Are you sure you want to cancel this reservation?")) {
                    this.closest('.reservation-card').style.opacity = '0.5';
                    this.innerText = "Cancelled";
                    this.disabled = true;
                    Utils.toast('Reservation cancelled successfully.', 'success');
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
    } else if (path.includes('my-reservations')) {
        AuthUI.injectNavbar('student');
        MyReservationsPage.init();
    } else if (path.includes('search')) {
        AuthUI.injectNavbar('student');
        SearchPage.init();
    } else if (path.includes('manage-reservations') || path.includes('all-reservations')) {
        AuthUI.injectNavbar('technician');
    }
});