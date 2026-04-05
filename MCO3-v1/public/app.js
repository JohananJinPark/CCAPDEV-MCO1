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
            display:flex; align-items:center; gap:8px;
            transition: opacity 0.3s;
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
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
        return sorted[0] + ' – ' + sorted[sorted.length - 1];
    },

    /* inline field validation helpers */
    setFieldError(inputEl, message) {
        inputEl.style.borderColor = '#dc2626';
        inputEl.style.boxShadow   = '0 0 0 3px rgba(220,38,38,0.15)';
        let err = inputEl.parentElement.querySelector('.field-error');
        if (!err) {
            err = document.createElement('p');
            err.className = 'field-error';
            err.style.cssText = 'color:#dc2626;font-size:12px;margin-top:4px;';
            inputEl.parentElement.appendChild(err);
        }
        err.textContent = message;
    },

    clearFieldError(inputEl) {
        inputEl.style.borderColor = '';
        inputEl.style.boxShadow   = '';
        const err = inputEl.parentElement.querySelector('.field-error');
        if (err) err.remove();
    },

    /* Attach live validation to an input */
    liveValidate(inputEl, rules) {
        const validate = () => {
            for (const { test, msg } of rules) {
                if (!test(inputEl.value)) {
                    Utils.setFieldError(inputEl, msg);
                    return false;
                }
            }
            Utils.clearFieldError(inputEl);
            return true;
        };
        inputEl.addEventListener('blur', validate);
        inputEl.addEventListener('input', () => {
            if (inputEl.parentElement.querySelector('.field-error')) validate();
        });
        return validate;
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
                        <a href="/about"                style="color:white;text-decoration:none;">About</a>
                    ` : `
                        <a href="/student-dashboard"    style="color:white; text-decoration:none;">Dashboard</a>
                        <a href="/view-slots"           style="color:white; text-decoration:none;">Book a Seat</a>
                        <a href="/my-reservations"      style="color:white; text-decoration:none;">My Reservations</a>
                        <a href="/search"               style="color:white; text-decoration:none;">Search Slots</a>
                        <a href="/about"                style="color:white;text-decoration:none;">About</a>
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

/* Login */
const LoginPage = {
    init() {
        const form = document.querySelector('form[action="/api/login"]');
        if (!form) return;

        const emailEl = document.getElementById('email');
        const pwEl    = document.getElementById('password');

        /* Live validation rules */
        Utils.liveValidate(emailEl, [
            { test: v => v.trim() !== '',           msg: 'Email is required.' },
            { test: v => Utils.isValidDLSUEmail(v), msg: 'Must be a valid @dlsu.edu.ph email.' }
        ]);
        Utils.liveValidate(pwEl, [
            { test: v => v !== '', msg: 'Password is required.' }
        ]);

        form.addEventListener('submit', (e) => {
            let valid = true;

            if (!emailEl.value.trim()) {
                Utils.setFieldError(emailEl, 'Email is required.');
                valid = false;
            } else if (!Utils.isValidDLSUEmail(emailEl.value.trim())) {
                Utils.setFieldError(emailEl, 'Must be a valid @dlsu.edu.ph email.');
                valid = false;
            } else {
                Utils.clearFieldError(emailEl);
            }

            if (!pwEl.value) {
                Utils.setFieldError(pwEl, 'Password is required.');
                valid = false;
            } else {
                Utils.clearFieldError(pwEl);
            }

            if (!valid) e.preventDefault();
        });

        /* Demo-account auto-fill */
        document.querySelectorAll('.demo-buttons button').forEach(btn => {
            btn.addEventListener('click', () => {
                const text = btn.textContent;
                if (text.includes('Student')) {
                    emailEl.value = 'juan.delacruz@dlsu.edu.ph';
                    pwEl.value    = 'password123';
                } else if (text.includes('Technician')) {
                    emailEl.value = 'carlos.reyes@dlsu.edu.ph';
                    pwEl.value    = 'password123';
                }
            });
        });
    }
};

/* Register */
const RegisterPage = {
    init() {
        const form = document.getElementById('registerForm');
        if (!form) return;

        const nameEl      = document.getElementById('regName');
        const emailEl     = document.getElementById('regEmail');
        const pwEl        = document.getElementById('regPw');
        const confirmPwEl = document.getElementById('regConfirmPw');

        /* Live validation */
        Utils.liveValidate(nameEl, [
            { test: v => v.trim() !== '',   msg: 'Full name is required.' },
            { test: v => v.trim().length >= 2, msg: 'Name must be at least 2 characters.' }
        ]);
        Utils.liveValidate(emailEl, [
            { test: v => v.trim() !== '',           msg: 'Email is required.' },
            { test: v => Utils.isValidDLSUEmail(v), msg: 'Must be a valid @dlsu.edu.ph email.' }
        ]);
        Utils.liveValidate(pwEl, [
            { test: v => v.length >= 8,                        msg: 'Password must be at least 8 characters.' },
            { test: v => /[A-Za-z]/.test(v),                  msg: 'Password must contain at least one letter.' },
            { test: v => /[0-9!@#$%^&*]/.test(v),             msg: 'Password must contain a number or special character.' }
        ]);
        Utils.liveValidate(confirmPwEl, [
            { test: v => v !== '',                msg: 'Please confirm your password.' },
            { test: v => v === pwEl.value,        msg: 'Passwords do not match.' }
        ]);

        /* Password strength indicator */
        const strengthBar  = document.querySelector('.strength-bar');
        const strengthText = document.querySelector('.strength-text');
        if (pwEl && strengthBar && strengthText) {
            pwEl.addEventListener('input', () => {
                const v = pwEl.value;
                let score = 0;
                if (v.length >= 8)                 score++;
                if (/[A-Z]/.test(v))               score++;
                if (/[0-9]/.test(v))               score++;
                if (/[!@#$%^&*]/.test(v))          score++;

                const bars   = strengthBar.querySelectorAll('div');
                const colors = ['#ef4444','#f97316','#eab308','#22c55e'];
                const labels = ['Weak','Fair','Good','Strong'];
                bars.forEach((b, i) => {
                    b.style.background = i < score ? colors[score - 1] : '#e5e7eb';
                });
                strengthText.textContent = score > 0 ? `Strength: ${labels[score - 1]}` : 'Password strength';
                strengthText.style.color = score > 0 ? colors[score - 1] : '#888';
            });
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name      = nameEl.value.trim();
            const email     = emailEl.value.trim();
            const pw        = pwEl.value;
            const confirmPw = confirmPwEl.value;
            const role      = document.getElementById('regRole').value;

            let valid = true;

            /* Name */
            if (!name) {
                Utils.setFieldError(nameEl, 'Full name is required.');
                valid = false;
            } else if (name.length < 2) {
                Utils.setFieldError(nameEl, 'Name must be at least 2 characters.');
                valid = false;
            } else {
                Utils.clearFieldError(nameEl);
            }

            /* Email */
            if (!email) {
                Utils.setFieldError(emailEl, 'Email is required.');
                valid = false;
            } else if (!Utils.isValidDLSUEmail(email)) {
                Utils.setFieldError(emailEl, 'Must be a valid @dlsu.edu.ph email.');
                valid = false;
            } else {
                Utils.clearFieldError(emailEl);
            }

            /* Password */
            if (pw.length < 8) {
                Utils.setFieldError(pwEl, 'Password must be at least 8 characters.');
                valid = false;
            } else if (!/[A-Za-z]/.test(pw)) {
                Utils.setFieldError(pwEl, 'Password must contain at least one letter.');
                valid = false;
            } else if (!/[0-9!@#$%^&*]/.test(pw)) {
                Utils.setFieldError(pwEl, 'Password must contain a number or special character.');
                valid = false;
            } else {
                Utils.clearFieldError(pwEl);
            }

            /* Confirm password */
            if (!confirmPw) {
                Utils.setFieldError(confirmPwEl, 'Please confirm your password.');
                valid = false;
            } else if (pw !== confirmPw) {
                Utils.setFieldError(confirmPwEl, 'Passwords do not match.');
                valid = false;
            } else {
                Utils.clearFieldError(confirmPwEl);
            }

            if (!valid) return;

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

/* Student Dashboard */
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

/* Tech Dashboard */
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

/* View Slots / Book a Seat */
const ViewSlotsPage = {
    selectedSeat: null,
    selectedSlots: [],
    selectedLab: 'gokongwei',
    selectedDate: null,
 
    ALL_SLOTS: [
        '08:00','08:30','09:00','09:30','10:00','10:30',
        '11:00','11:30','12:00','12:30','13:00','13:30',
        '14:00','14:30','15:00','15:30','16:00','16:30',
        '17:00','17:30','18:00','18:30'
    ],
 
    /* Returns YYYY-MM-DD for a date that is `offset` days from today (local time) */
    getDateString(offset = 0) {
        const d = new Date();
        d.setDate(d.getDate() + offset);
        const yyyy = d.getFullYear();
        const mm   = String(d.getMonth() + 1).padStart(2, '0');
        const dd   = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    },
 
    /* Returns current local time as "HH:MM" */
    getNowTime() {
        const n = new Date();
        return String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0');
    },
 
    /* Returns slots that are still in the future for a given date string */
    getFutureSlots(dateStr) {
        const today = this.getDateString(0);
        if (dateStr !== today) return this.ALL_SLOTS; // future day → all slots open
        const now = this.getNowTime();
        return this.ALL_SLOTS.filter(t => t > now);
    },
 
    /* Build and inject the 7-day date button strip */
    buildDateButtons() {
        const container = document.querySelector('.dates');
        if (!container) return;
 
        const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const MON_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 
        container.innerHTML = '';
 
        for (let i = 0; i < 7; i++) {
            const d       = new Date();
            d.setDate(d.getDate() + i);
            const dateStr = this.getDateString(i);
            const label   = i === 0 ? 'Today' : DAY_LABELS[d.getDay()];
            const dayNum  = d.getDate();
            const month   = MON_LABELS[d.getMonth()];
 
            const btn = document.createElement('button');
            btn.className  = 'date' + (i === 0 ? ' active' : '');
            btn.dataset.date = dateStr;
            btn.innerHTML  = `<span>${label}</span><span>${month} ${dayNum}</span>`;
 
            btn.addEventListener('click', () => {
                document.querySelectorAll('.date').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedDate = dateStr;
                /* If a seat was already selected, refresh the slot panel */
                if (this.selectedSeat !== null) this.showSlotPanel();
            });
 
            container.appendChild(btn);
        }
    },
 
    init() {
        AuthUI.injectNavbar();
 
        /* Set today as default selected date */
        this.selectedDate = this.getDateString(0);
 
        /* Dynamically build the date buttons */
        this.buildDateButtons();
 
        /* Lab selector */
        const labSelect = document.querySelector('select');
        if (labSelect) {
            labSelect.addEventListener('change', function () {
                ViewSlotsPage.selectedLab = this.value;
            });
        }
 
        /* Seat clicks */
        document.querySelectorAll('.seat').forEach(seat => {
            seat.addEventListener('click', function () {
                if (this.classList.contains('reserved') || this.classList.contains('blocked')) return;
                document.querySelectorAll('.seat').forEach(s => s.classList.remove('selected-seat'));
                this.classList.add('selected-seat');
                ViewSlotsPage.selectedSeat = parseInt(this.textContent);
                ViewSlotsPage.showSlotPanel();
            });
        });
    },
 
    showSlotPanel() {
        const panel = document.querySelector('.seat-panel');
        if (!panel) return;
 
        const futureSlots = this.getFutureSlots(this.selectedDate);
        const allSlots    = this.ALL_SLOTS;
 
        /* If today and NO slots remain, show a message instead */
        const isToday = this.selectedDate === this.getDateString(0);
        if (isToday && futureSlots.length === 0) {
            panel.innerHTML = `
                <h3>Seat ${this.selectedSeat} Selected</h3>
                <p style="font-size:13px;color:#dc2626;margin:12px 0;
                           background:#fee2e2;padding:10px;border-radius:8px;">
                    ⚠ No more available time slots for today.<br>
                    Please select a future date to book.
                </p>`;
            this.selectedSlots = [];
            return;
        }
 
        panel.innerHTML = `
            <h3>Seat ${this.selectedSeat} Selected</h3>
            <p style="font-size:13px;color:#666;margin:8px 0;">Pick one or more time slots:</p>
            ${isToday ? `<p style="font-size:11px;color:#d97706;margin-bottom:8px;">
                ⏰ Past slots are unavailable for today.</p>` : ''}
            <div class="slots" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:12px;">
                ${allSlots.map(t => {
                    const isPast = isToday && !futureSlots.includes(t);
                    return `<button class="slot-btn" data-time="${t}" ${isPast ? 'disabled' : ''}
                        style="padding:6px;border:1px solid ${isPast ? '#f0f0f0' : '#ddd'};
                               border-radius:6px;font-size:12px;
                               cursor:${isPast ? 'not-allowed' : 'pointer'};
                               background:${isPast ? '#f5f5f5' : 'white'};
                               color:${isPast ? '#bbb' : 'inherit'};">
                        ${t}${isPast ? '<br><span style="font-size:10px;">past</span>' : ''}
                    </button>`;
                }).join('')}
            </div>
            <div>
                <label style="font-size:13px;color:#666;">
                    <input type="checkbox" id="anonCheck"> Book anonymously
                </label>
            </div>
            <p id="slotError" style="color:#dc2626;font-size:12px;margin-top:6px;display:none;">
                Please select at least one time slot.
            </p>
            <button id="confirmReservationBtn"
                style="background:#006B3F;color:white;padding:10px;border:none;
                       border-radius:8px;width:100%;margin-top:12px;cursor:pointer;font-size:14px;">
                Confirm Reservation
            </button>`;
 
        this.selectedSlots = [];
        panel.querySelectorAll('.slot-btn:not([disabled])').forEach(btn => {
            btn.addEventListener('click', function () {
                const t = this.dataset.time;
                document.getElementById('slotError').style.display = 'none';
                if (ViewSlotsPage.selectedSlots.includes(t)) {
                    ViewSlotsPage.selectedSlots = ViewSlotsPage.selectedSlots.filter(s => s !== t);
                    this.style.background  = 'white';
                    this.style.borderColor = '#ddd';
                    this.style.color       = 'black';
                } else {
                    ViewSlotsPage.selectedSlots.push(t);
                    this.style.background  = '#006B3F';
                    this.style.borderColor = '#006B3F';
                    this.style.color       = 'white';
                }
            });
        });
 
        panel.querySelector('#confirmReservationBtn').addEventListener('click', () => {
            this.submitReservation();
        });
    },
 
    async submitReservation() {
        /* Front-end validation */
        if (!this.selectedSeat) {
            Utils.toast('Please select a seat first.', 'error');
            return;
        }
        if (this.selectedSlots.length === 0) {
            const errEl = document.getElementById('slotError');
            if (errEl) errEl.style.display = 'block';
            Utils.toast('Please select at least one time slot.', 'error');
            return;
        }
 
        const body = {
            lab:       this.selectedLab,
            seat:      this.selectedSeat,
            date:      this.selectedDate,
            slots:     this.selectedSlots,
            anonymous: document.getElementById('anonCheck')?.checked || false
        };
 
        try {
            const res  = await fetch('/api/reservations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (res.ok) {
                Utils.toast('Reservation confirmed! ✔', 'success');
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
 
};

/* My Reservations */
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
                    if (!confirm('Are you sure you want to cancel this reservation?')) return;
                    const id  = this.dataset.id;
                    const res = await fetch(`/api/reservations/${id}`, { method: 'DELETE' });
                    if (res.ok) {
                        Utils.toast('Reservation cancelled.', 'success');
                        MyReservationsPage.loadReservations();
                    } else {
                        const data = await res.json();
                        Utils.toast(data.message || 'Could not cancel.', 'error');
                    }
                });
            });

        } catch (err) {
            Utils.toast('Error loading reservations.', 'error');
        }
    }
};

/* All Reservations (Tech)  */
const AllReservationsPage = {
    allData: [],
 
    async init() {
        await AuthUI.injectNavbar();
        try {
            const res  = await fetch('/api/reservations');
            if (!res.ok) return;
            this.allData = await res.json();
 
            this.updateSummary(this.allData);
            this.renderTable(this.allData);
            this.initFilters();
        } catch (err) {
            console.log('Error loading all reservations:', err);
        }
    },
 
    updateSummary(data) {
        const summaryH2 = document.querySelectorAll('.summary-card h2');
        if (summaryH2[0]) summaryH2[0].textContent = data.length;
        if (summaryH2[1]) summaryH2[1].textContent = data.filter(r => r.status === 'confirmed').length;
        if (summaryH2[2]) summaryH2[2].textContent = data.filter(r => r.status === 'pending').length;
        if (summaryH2[3]) summaryH2[3].textContent = data.filter(r => r.status === 'cancelled').length;
    },
 
    renderTable(data) {
        const tbody = document.querySelector('tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
 
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#999;">No reservations found.</td></tr>`;
            return;
        }
 
        data.forEach((r, i) => {
            const name  = r.anonymous ? 'Anonymous' : (r.userId?.name  || '—');
            const email = r.anonymous ? '—'         : (r.userId?.email || '—');
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
 
        /* Update result count */
        const resultsEl = document.querySelector('.results');
        if (resultsEl) resultsEl.textContent = `${data.length} result${data.length !== 1 ? 's' : ''}`;
    },
 
    initFilters() {
        const searchInput  = document.querySelector('.filters input[type="text"]');
        const labSelect    = document.querySelectorAll('.filters select')[0];
        const statusSelect = document.querySelectorAll('.filters select')[1];
 
        const applyFilters = () => {
            let filtered = [...this.allData];
            const q = searchInput?.value.toLowerCase() || '';
            if (q) {
                filtered = filtered.filter(r => {
                    const name  = r.anonymous ? 'anonymous' : (r.userId?.name  || '').toLowerCase();
                    const email = r.anonymous ? ''          : (r.userId?.email || '').toLowerCase();
                    return name.includes(q) || email.includes(q) || r.lab.toLowerCase().includes(q);
                });
            }
            const lab = labSelect?.value || '';
            if (lab && lab !== 'All Labs') {
                filtered = filtered.filter(r => r.lab.toLowerCase().includes(lab.toLowerCase()));
            }
            const status = statusSelect?.value || '';
            if (status && status !== 'All Statuses') {
                filtered = filtered.filter(r => r.status === status.toLowerCase());
            }
            this.renderTable(filtered);
        };
 
        searchInput?.addEventListener('input',  applyFilters);
        labSelect?.addEventListener('change',   applyFilters);
        statusSelect?.addEventListener('change', applyFilters);
    }
};

/* Manage Reservations (Tech) */
const ManageReservationsPage = {
    allData: [],
 
    async init() {
        await AuthUI.injectNavbar();
        try {
            const res  = await fetch('/api/reservations');
            if (!res.ok) return;
            this.allData = await res.json();
            this.renderTable(this.allData);
            this.initFilters();
        } catch (err) {
            console.log('Error loading manage reservations:', err);
        }
    },
 
    renderTable(data) {
        const tbody = document.querySelector('tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
 
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#999;">No reservations found.</td></tr>`;
            return;
        }
 
        data.forEach((r, i) => {
            const name  = r.anonymous ? 'Anonymous' : (r.userId?.name  || '—');
            const email = r.anonymous ? '—'         : (r.userId?.email || '—');
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
                    <td>
                        <select class="status-select" data-id="${r._id}"
                            style="border:1px solid #ddd;border-radius:6px;padding:4px 8px;font-size:12px;">
                            <option value="confirmed" ${r.status==='confirmed'?'selected':''}>Confirmed</option>
                            <option value="pending"   ${r.status==='pending'  ?'selected':''}>Pending</option>
                            <option value="cancelled" ${r.status==='cancelled'?'selected':''}>Cancelled</option>
                        </select>
                    </td>
                    <td>
                        <div class="actions">
                            <button class="delete" data-id="${r._id}" title="Delete">🗑️</button>
                        </div>
                    </td>
                </tr>`;
        });
 
        /* Status change */
        tbody.querySelectorAll('.status-select').forEach(sel => {
            sel.addEventListener('change', async function () {
                const id     = this.dataset.id;
                const status = this.value;
                const res    = await fetch(`/api/reservations/${id}`, {
                    method:  'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ status })
                });
                if (res.ok) {
                    Utils.toast(`Status updated to ${status}.`, 'success');
                } else {
                    Utils.toast('Could not update status.', 'error');
                }
            });
        });
 
        /* Delete */
        tbody.querySelectorAll('.delete').forEach(btn => {
            btn.addEventListener('click', async function () {
                if (!confirm('Delete this reservation permanently?')) return;
                const id  = this.dataset.id;
                const res = await fetch(`/api/reservations/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    Utils.toast('Reservation deleted.', 'success');
                    ManageReservationsPage.init();
                } else {
                    Utils.toast('Could not delete.', 'error');
                }
            });
        });
    },
 
    initFilters() {
        const searchInput  = document.querySelector('.filters input[type="text"]');
        const labSelect    = document.querySelectorAll('.filters select')[0];
        const statusSelect = document.querySelectorAll('.filters select')[1];
 
        const applyFilters = () => {
            let filtered = [...this.allData];
            const q = searchInput?.value.toLowerCase() || '';
            if (q) {
                filtered = filtered.filter(r => {
                    const name  = (r.userId?.name  || '').toLowerCase();
                    const email = (r.userId?.email || '').toLowerCase();
                    return name.includes(q) || email.includes(q) || r.lab.toLowerCase().includes(q);
                });
            }
            const lab = labSelect?.value || '';
            if (lab && !lab.startsWith('All')) {
                filtered = filtered.filter(r => r.lab.toLowerCase().includes(lab.toLowerCase()));
            }
            const status = statusSelect?.value || '';
            if (status && !status.startsWith('All')) {
                filtered = filtered.filter(r => r.status === status.toLowerCase());
            }
            this.renderTable(filtered);
        };
 
        searchInput?.addEventListener('input',   applyFilters);
        labSelect?.addEventListener('change',    applyFilters);
        statusSelect?.addEventListener('change', applyFilters);
    }
};

/* Search */
const SearchPage = {
    init() {
        AuthUI.injectNavbar();
        const searchBtn = document.querySelector('.search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', async () => {
                const lab      = document.querySelectorAll('.field select')[0]?.value || '';
                const date     = document.querySelectorAll('.field select')[1]?.value || '';
                const fromTime = document.querySelectorAll('.field select')[2]?.value || '';
                const toTime   = document.querySelectorAll('.field select')[3]?.value || '';
 
                /* Front-end validation */
                if (fromTime && toTime && fromTime !== 'Any time' && toTime !== 'Any time') {
                    if (fromTime >= toTime) {
                        Utils.toast('"From Time" must be earlier than "Until Time".', 'error');
                        return;
                    }
                }
 
                Utils.toast('Searching available slots…', 'success');
            });
        }
    }
};
 
/* Profile */
const ProfilePage = {
    async init() {
        await AuthUI.injectNavbar();
 
        /* Hide the static success banner on load */
        const successBanner = document.querySelector('.success');
        if (successBanner) successBanner.style.display = 'none';
 
        /* Load real user data */
        try {
            const res  = await fetch('/api/me');
            if (!res.ok) return;
            const user = await res.json();
 
            /* Get full profile from a dedicated endpoint if available */
            const profileRes  = await fetch('/api/profile');
            if (!profileRes.ok) return;
            const profile = await profileRes.json();
 
            /* Populate profile card */
            const avatarEl = document.querySelector('.avatar');
            if (avatarEl) {
                avatarEl.textContent = profile.name ? profile.name[0].toUpperCase() : '?';
                if (profile.avatarColor) avatarEl.style.background = profile.avatarColor;
            }
 
            document.querySelectorAll('.profile-card h2').forEach(el => el.textContent = profile.name || '');
            document.querySelectorAll('.profile-card .email').forEach(el => el.textContent = profile.email || '');
            document.querySelectorAll('.profile-card .role').forEach(el => el.textContent = profile.role || '');
 
            /* Populate info fields */
            const values = document.querySelectorAll('.value');
            if (values[0]) values[0].textContent = profile.name  || '—';
            if (values[1]) values[1].textContent = profile.email || '—';
            if (values[2]) values[2].textContent = profile.role  || '—';
            if (values[3]) values[3].textContent = profile.bio   || '—';
 
        } catch (err) {
            console.log('Profile load error:', err);
        }
 
        /* Edit button → inline form */
        const editBtn = document.querySelector('.edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => this.showEditForm());
        }
 
        /* Delete account */
        const deleteBtn = document.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                if (!confirm('Are you absolutely sure? This action cannot be undone.')) return;
                const res = await fetch('/api/profile', { method: 'DELETE' });
                if (res.ok) {
                    Utils.toast('Account deleted.', 'success');
                    setTimeout(() => window.location.href = '/', 1500);
                } else {
                    Utils.toast('Could not delete account.', 'error');
                }
            });
        }
    },
 
    showEditForm() {
        const card = document.querySelector('.card:nth-of-type(1) .right > .card, .right > .card:first-child');
        const infoCard = Array.from(document.querySelectorAll('.card')).find(c => c.querySelector('.card-header h3')?.textContent === 'Profile Information');
        if (!infoCard) return;
 
        const nameVal  = infoCard.querySelectorAll('.value')[0]?.textContent || '';
        const bioVal   = infoCard.querySelectorAll('.value')[3]?.textContent || '';
 
        infoCard.innerHTML = `
            <h3 style="margin-bottom:15px;">Edit Profile</h3>
            <div class="form-group" style="margin-bottom:12px;">
                <label style="font-size:13px;color:#777;">Full Name</label>
                <input id="editName" value="${nameVal}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:10px;margin-top:4px;">
            </div>
            <div class="form-group" style="margin-bottom:12px;">
                <label style="font-size:13px;color:#777;">Bio</label>
                <textarea id="editBio" rows="3" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:10px;margin-top:4px;resize:vertical;">${bioVal !== '—' ? bioVal : ''}</textarea>
            </div>
            <div style="display:flex;gap:10px;">
                <button id="saveProfileBtn"
                    style="background:#006B3F;color:white;border:none;padding:10px 16px;border-radius:10px;cursor:pointer;font-size:14px;">
                    Save Changes
                </button>
                <button id="cancelEditBtn"
                    style="border:1px solid #ddd;background:white;padding:10px 16px;border-radius:10px;cursor:pointer;font-size:14px;">
                    Cancel
                </button>
            </div>`;
 
        const nameInput = document.getElementById('editName');
        const bioInput  = document.getElementById('editBio');
 
        /* Live validation */
        Utils.liveValidate(nameInput, [
            { test: v => v.trim() !== '',      msg: 'Name cannot be empty.' },
            { test: v => v.trim().length >= 2, msg: 'Name must be at least 2 characters.' }
        ]);
 
        document.getElementById('saveProfileBtn').addEventListener('click', async () => {
            const name = nameInput.value.trim();
            const bio  = bioInput.value.trim();
 
            if (!name) {
                Utils.setFieldError(nameInput, 'Name cannot be empty.');
                return;
            }
            if (name.length < 2) {
                Utils.setFieldError(nameInput, 'Name must be at least 2 characters.');
                return;
            }
 
            const res = await fetch('/api/profile', {
                method:  'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ name, bio })
            });
 
            if (res.ok) {
                Utils.toast('Profile updated successfully!', 'success');
                setTimeout(() => window.location.reload(), 1000);
            } else {
                const data = await res.json();
                Utils.toast(data.message || 'Could not update profile.', 'error');
            }
        });
 
        document.getElementById('cancelEditBtn').addEventListener('click', () => {
            window.location.reload();
        });
    }
};

/* 4. ROUTER */
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
 
    if      (path.includes('login'))                LoginPage.init();
    else if (path.includes('register'))             RegisterPage.init();
    else if (path.includes('student-dashboard'))    StudentDashboard.init();
    else if (path.includes('tech-dashboard'))       TechDashboard.init();
    else if (path.includes('view-slots'))           ViewSlotsPage.init();
    else if (path.includes('my-reservations'))      MyReservationsPage.init();
    else if (path.includes('all-reservations'))     AllReservationsPage.init();
    else if (path.includes('manage-reservations'))  ManageReservationsPage.init();
    else if (path.includes('search'))               SearchPage.init();
    else if (path.includes('reserve-student'))      AuthUI.injectNavbar();
    else if (path.includes('profile'))              ProfilePage.init();
});