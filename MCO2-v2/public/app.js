/* 1. UTILITIES */
const Utils = {
    isValidDLSUEmail(email) {
        return /^[^\s@]+@dlsu\.edu(\.ph)?$/.test(email);
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
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    },
    formatDate(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },
    formatSlots(slots) {
        if (!slots || slots.length === 0) return '—';
        const sorted = [...slots].sort();
        return sorted[0] + ' – ' + (sorted[sorted.length - 1]);
    }
};

/* 2. AUTH & NAVBAR */
const AuthUI = {
    async injectNavbar() {
        if (document.querySelector('.app-navbar')) return;
        try {
            const res  = await fetch('/api/me');
            if (!res.ok) return; // not logged in
            const user = await res.json();

            const nav  = document.createElement('nav');
            nav.className = 'app-navbar';
            const isTech  = user.role === 'technician';

            nav.innerHTML = `
            <div style="background:#006B3F; padding:15px 20px; color:white;
                        display:flex; justify-content:space-between; align-items:center;
                        box-shadow:0 4px 6px rgba(0,0,0,0.1); font-family:Inter,sans-serif;">
                <a href="${isTech ? '/tech-dashboard' : '/student-dashboard'}"
                   style="color:white; text-decoration:none; font-weight:bold; font-size:18px;">
                    AnimoLabs
                </a>
                <div style="display:flex; gap:15px; font-size:14px; align-items:center;">
                    ${isTech ? `
                        <a href="/tech-dashboard"       style="color:white; text-decoration:none;">Dashboard</a>
                        <a href="/manage-reservations"  style="color:white; text-decoration:none;">Manage</a>
                        <a href="/all-reservations"     style="color:white; text-decoration:none;">All Reservations</a>
                    ` : `
                        <a href="/student-dashboard"    style="color:white; text-decoration:none;">Dashboard</a>
                        <a href="/view-slots"           style="color:white; text-decoration:none;">Book a Seat</a>
                        <a href="/my-reservations"      style="color:white; text-decoration:none;">My Reservations</a>
                        <a href="/search"               style="color:white; text-decoration:none;">Search Slots</a>
                    `}
                    <span style="color:#d1fae5; font-size:13px;">Hi, ${user.name.split(' ')[0]}</span>
                    <a href="/api/logout"
                       style="color:#ffcccc; text-decoration:none; border:1px solid #ffcccc;
                              padding:3px 10px; border-radius:5px;">Logout</a>
                </div>
            </div>`;
            document.body.prepend(nav);
        } catch (e) { /* not logged in */ }
    }
};

/* 3. PAGE CONTROLLERS */

/* ── Register ── */
const RegisterPage = {
    init() {
        const form = document.getElementById('registerForm');
        if (!form) return;
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name      = document.getElementById('regName').value.trim();
            const email     = document.getElementById('regEmail').value.trim();
            const pw        = document.getElementById('regPw').value;
            const confirmPw = document.getElementById('regConfirmPw').value;
            const role      = document.getElementById('regRole').value;

            if (!Utils.isValidDLSUEmail(email))
                return Utils.toast('Must use a valid @dlsu.edu.ph email.', 'error');
            if (pw.length < 8)
                return Utils.toast('Password must be at least 8 characters.', 'error');
            if (pw !== confirmPw)
                return Utils.toast('Passwords do not match.', 'error');

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password: pw, role })
                });
                const data = await response.json();
                if (response.ok) {
                    Utils.toast('Account created! Redirecting to login…', 'success');
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

/* ── Student Dashboard ── */
const StudentDashboard = {
    async init() {
        await AuthUI.injectNavbar();
        try {
            const res  = await fetch('/api/my-reservations');
            if (!res.ok) return;
            const data = await res.json();

            // Update stat count
            const upcoming = data.filter(r => r.status !== 'cancelled');
            const el = document.querySelector('.stat-card h2');
            if (el) el.textContent = upcoming.length;

            // Populate upcoming reservation list
            const listEl = document.querySelector('.card .reservation:first-of-type')?.parentElement;
            if (listEl && data.length > 0) {
                // Remove static placeholder rows
                listEl.querySelectorAll('.reservation').forEach(el => el.remove());
                data.slice(0, 3).forEach(r => {
                    const div = document.createElement('div');
                    div.className = 'reservation';
                    div.innerHTML = `
                        <div class="seat">${r.seat}</div>
                        <div>
                            <h4>${r.lab} – Seat ${r.seat}</h4>
                            <p>${Utils.formatDate(r.date)} • ${Utils.formatSlots(r.slots)}</p>
                        </div>
                        <span class="status ${r.status}">${r.status}</span>`;
                    listEl.appendChild(div);
                });
            }
        } catch (err) {
            console.log('Could not load reservations:', err);
        }
    }
};

/* ── Tech Dashboard ── */
const TechDashboard = {
    async init() {
        await AuthUI.injectNavbar();
        try {
            const res  = await fetch('/api/reservations');
            if (!res.ok) return;
            const data = await res.json();

            const confirmed = data.filter(r => r.status === 'confirmed').length;
            const pending   = data.filter(r => r.status === 'pending').length;
            const cards     = document.querySelectorAll('.stat-card h2');
            if (cards[0]) cards[0].textContent = confirmed;
            if (cards[1]) cards[1].textContent = pending;
            if (cards[2]) cards[2].textContent = data.length;
        } catch (err) {
            console.log('Could not load tech stats:', err);
        }
    }
};

/* ── View Slots / Book a Seat ── */
const ViewSlotsPage = {
    selectedSeat: null,
    selectedSlots: [],
    selectedLab: 'gokongwei',
    selectedDate: null,

    init() {
        AuthUI.injectNavbar();

        // Set today's date as default
        const today = new Date().toISOString().split('T')[0];
        this.selectedDate = today;

        // Date buttons
        document.querySelectorAll('.date').forEach(btn => {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.date').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                ViewSlotsPage.selectedDate = this.dataset.date || today;
                ViewSlotsPage.loadAvailability();
            });
        });

        // Lab select
        const labSelect = document.querySelector('select');
        if (labSelect) {
            labSelect.addEventListener('change', function () {
                ViewSlotsPage.selectedLab = this.value;
                ViewSlotsPage.loadAvailability();
            });
        }

        // Seat clicks
        document.querySelectorAll('.seat').forEach(seat => {
            seat.addEventListener('click', function () {
                if (this.classList.contains('reserved') || this.classList.contains('blocked')) return;

                document.querySelectorAll('.seat').forEach(s =>
                    s.classList.remove('selected-seat'));
                this.classList.add('selected-seat');
                ViewSlotsPage.selectedSeat = parseInt(this.textContent);
                ViewSlotsPage.showSlotPanel();
            });
        });
    },

    showSlotPanel() {
        const panel = document.querySelector('.seat-panel');
        if (!panel) return;

        const timeSlots = [
            '08:00','08:30','09:00','09:30','10:00','10:30',
            '11:00','11:30','12:00','12:30','13:00','13:30',
            '14:00','14:30','15:00','15:30','16:00','16:30',
            '17:00','17:30','18:00','18:30'
        ];

        panel.innerHTML = `
            <h3>Seat ${this.selectedSeat} Selected</h3>
            <p style="font-size:13px;color:#666;margin:8px 0;">Pick one or more time slots:</p>
            <div class="slots" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:12px;">
                ${timeSlots.map(t => `
                    <button class="slot-btn" data-time="${t}"
                        style="padding:6px;border:1px solid #ddd;border-radius:6px;
                               font-size:12px;cursor:pointer;background:white;">
                        ${t}
                    </button>`).join('')}
            </div>
            <div>
                <label style="font-size:13px;color:#666;">
                    <input type="checkbox" id="anonCheck"> Book anonymously
                </label>
            </div>
            <button id="confirmReservationBtn"
                style="background:#006B3F;color:white;padding:10px;border:none;
                       border-radius:8px;width:100%;margin-top:12px;cursor:pointer;font-size:14px;">
                Confirm Reservation
            </button>`;

        // Slot toggle
        this.selectedSlots = [];
        panel.querySelectorAll('.slot-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const t = this.dataset.time;
                if (ViewSlotsPage.selectedSlots.includes(t)) {
                    ViewSlotsPage.selectedSlots = ViewSlotsPage.selectedSlots.filter(s => s !== t);
                    this.style.background = 'white';
                    this.style.borderColor = '#ddd';
                    this.style.color = 'black';
                } else {
                    ViewSlotsPage.selectedSlots.push(t);
                    this.style.background = '#006B3F';
                    this.style.borderColor = '#006B3F';
                    this.style.color = 'white';
                }
            });
        });

        // Confirm button
        panel.querySelector('#confirmReservationBtn').addEventListener('click', () => {
            this.submitReservation();
        });
    },

    async submitReservation() {
        if (!this.selectedSeat) return Utils.toast('Please select a seat.', 'error');
        if (this.selectedSlots.length === 0)
            return Utils.toast('Please select at least one time slot.', 'error');

        const body = {
            lab:   this.selectedLab,
            seat:  this.selectedSeat,
            date:  this.selectedDate,
            slots: this.selectedSlots,
            anonymous: document.getElementById('anonCheck')?.checked || false
        };

        try {
            const res = await fetch('/api/reservations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (res.ok) {
                Utils.toast('Reservation confirmed! ✔', 'success');
                // Mark seat as reserved in UI
                document.querySelectorAll('.seat').forEach(s => {
                    if (parseInt(s.textContent) === this.selectedSeat) {
                        s.classList.remove('available','selected-seat');
                        s.classList.add('mine');
                    }
                });
                const panel = document.querySelector('.seat-panel');
                if (panel) panel.innerHTML = `<h3>Booked ✔</h3>
                    <p style="color:#666;font-size:13px;margin-top:8px;">
                        Seat ${this.selectedSeat} reserved for ${Utils.formatSlots(this.selectedSlots)}.
                        <br><a href="/my-reservations" style="color:#006B3F;">View My Reservations →</a>
                    </p>`;
                this.selectedSeat  = null;
                this.selectedSlots = [];
            } else {
                Utils.toast(data.message || 'Booking failed.', 'error');
            }
        } catch (err) {
            Utils.toast('Server error. Please try again.', 'error');
        }
    },

    loadAvailability() {
        // Future: fetch seat status from DB for the selected lab/date
    }
};

/* ── My Reservations ── */
const MyReservationsPage = {
    async init() {
        await AuthUI.injectNavbar();
        await this.loadReservations();
    },

    async loadReservations() {
        const listEl = document.querySelector('.reservations');
        if (!listEl) return;

        try {
            const res  = await fetch('/api/my-reservations');
            if (!res.ok) { Utils.toast('Could not load reservations.', 'error'); return; }
            const data = await res.json();

            // Update summary counts
            const total     = data.length;
            const confirmed = data.filter(r => r.status === 'confirmed').length;
            const pending   = data.filter(r => r.status === 'pending').length;
            const summaryH2 = document.querySelectorAll('.summary-card h2');
            if (summaryH2[0]) summaryH2[0].textContent = total;
            if (summaryH2[1]) summaryH2[1].textContent = confirmed;
            if (summaryH2[2]) summaryH2[2].textContent = pending;

            listEl.innerHTML = '';

            if (data.length === 0) {
                listEl.innerHTML = `
                    <div class="empty">
                        <h3>No reservations yet</h3>
                        <p>Book a seat to get started.</p>
                        <button onclick="window.location='/view-slots'"
                            style="background:#006B3F;color:white;border:none;
                                   padding:10px 14px;border-radius:8px;cursor:pointer;">
                            Book a Seat
                        </button>
                    </div>`;
                return;
            }

            data.forEach(r => {
                const card = document.createElement('div');
                card.className = 'reservation-card';
                card.dataset.id = r._id;
                card.innerHTML = `
                    <div class="seat">${r.seat}</div>
                    <div class="info">
                        <div class="top">
                            <h3>${r.lab} – Seat ${r.seat}</h3>
                            <span class="status ${r.status}">${r.status}</span>
                        </div>
                        <div class="details">
                            <span>💻 ${r.lab}</span>
                            <span>📅 ${Utils.formatDate(r.date)}</span>
                            <span>⏰ ${Utils.formatSlots(r.slots)}</span>
                        </div>
                        <p class="booked">Booked on ${Utils.formatDate(r.bookedAt)}</p>
                    </div>
                    <div class="actions">
                        ${r.status !== 'cancelled'
                            ? `<button class="cancel" data-id="${r._id}">Cancel</button>`
                            : `<button disabled style="color:#aaa;border-color:#eee;">Cancelled</button>`}
                    </div>`;
                listEl.appendChild(card);
            });

            // Wire up cancel buttons
            listEl.querySelectorAll('.cancel').forEach(btn => {
                btn.addEventListener('click', async function () {
                    if (!confirm('Cancel this reservation?')) return;
                    const id  = this.dataset.id;
                    const res = await fetch(`/api/reservations/${id}`, { method: 'DELETE' });
                    if (res.ok) {
                        Utils.toast('Reservation cancelled.', 'success');
                        MyReservationsPage.loadReservations();
                    } else {
                        Utils.toast('Could not cancel.', 'error');
                    }
                });
            });

        } catch (err) {
            Utils.toast('Error loading reservations.', 'error');
        }
    }
};

/* ── All Reservations (Tech) ── */
const AllReservationsPage = {
    async init() {
        await AuthUI.injectNavbar();
        try {
            const res  = await fetch('/api/reservations');
            if (!res.ok) return;
            const data = await res.json();

            // Update summary
            const summaryH2 = document.querySelectorAll('.summary-card h2');
            if (summaryH2[0]) summaryH2[0].textContent = data.length;
            if (summaryH2[1]) summaryH2[1].textContent = data.filter(r=>r.status==='confirmed').length;
            if (summaryH2[2]) summaryH2[2].textContent = data.filter(r=>r.status==='pending').length;
            if (summaryH2[3]) summaryH2[3].textContent = data.filter(r=>r.status==='cancelled').length;

            const tbody = document.querySelector('tbody');
            if (!tbody) return;
            tbody.innerHTML = '';

            data.forEach((r, i) => {
                const name  = r.anonymous ? 'Anonymous' : (r.userId?.name || '—');
                const email = r.anonymous ? '—' : (r.userId?.email || '—');
                tbody.innerHTML += `
                    <tr class="${i % 2 === 1 ? 'alt' : ''}">
                        <td><div class="seat">${r.seat}</div></td>
                        <td>${r.lab}</td>
                        <td>
                            <div class="student">
                                <p class="name">${name}</p>
                                <p class="email">${email}</p>
                            </div>
                        </td>
                        <td>
                            <p>${Utils.formatDate(r.date)}</p>
                            <span class="time">${Utils.formatSlots(r.slots)}</span>
                        </td>
                        <td><span class="status ${r.status}">${r.status}</span></td>
                        <td class="booked">${Utils.formatDate(r.bookedAt)}</td>
                    </tr>`;
            });
        } catch (err) {
            console.log('Error loading all reservations:', err);
        }
    }
};

/* ── Search ── */
const SearchPage = {
    init() {
        AuthUI.injectNavbar();
        const searchBtn = document.querySelector('.search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                Utils.toast('Searching available slots…', 'success');
            });
        }
    }
};

/* 4. ROUTER */
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path.includes('register'))              RegisterPage.init();
    else if (path.includes('student-dashboard')) StudentDashboard.init();
    else if (path.includes('tech-dashboard'))   TechDashboard.init();
    else if (path.includes('view-slots'))       ViewSlotsPage.init();
    else if (path.includes('my-reservations'))  MyReservationsPage.init();
    else if (path.includes('all-reservations')) AllReservationsPage.init();
    else if (path.includes('manage-reservations')) AuthUI.injectNavbar();
    else if (path.includes('search'))           SearchPage.init();
    else if (path.includes('reserve-student'))  AuthUI.injectNavbar();
    else if (path.includes('profile'))          AuthUI.injectNavbar();
});