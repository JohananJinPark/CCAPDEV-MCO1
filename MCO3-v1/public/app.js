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
        // Add 30 minutes to the last slot to get the actual end time
        const [h, m] = sorted[sorted.length - 1].split(':').map(Number);
        const endDate = new Date(0, 0, 0, h, m + 30);
        const endStr = String(endDate.getHours()).padStart(2, '0') + ':' + String(endDate.getMinutes()).padStart(2, '0');
        return sorted[0] + ' – ' + endStr;
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
                        <a href="/profile"              style="color:white;text-decoration:none;">Profile</a>
                    ` : `
                        <a href="/student-dashboard"    style="color:white; text-decoration:none;">Dashboard</a>
                        <a href="/view-slots"           style="color:white; text-decoration:none;">Book a Seat</a>
                        <a href="/my-reservations"      style="color:white; text-decoration:none;">My Reservations</a>
                        <a href="/search"               style="color:white; text-decoration:none;">Search Slots</a>
                        <a href="/about"                style="color:white;text-decoration:none;">About</a>
                        <a href="/profile"              style="color:white;text-decoration:none;">Profile</a>
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
        const dateEl = document.getElementById('dashDate');
        if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-US',
            { weekday:'long', year:'numeric', month:'long', day:'numeric' });

        await this.loadData();
        setInterval(() => this.loadData(), 60000);
    },

    async loadData() {
        try {
            const [myRes, allRes] = await Promise.all([
                fetch('/api/my-reservations'),
                fetch('/api/reservations')
            ]);

            /* --- Upcoming reservations stat + list --- */
            if (myRes.ok) {
                const myData = await myRes.json();
                const upcoming = myData.filter(r => r.status !== 'cancelled');
                const el = document.querySelector('.stat-card h2');
                if (el) el.textContent = upcoming.length;

                const listEl = document.querySelector('.card .reservation:first-of-type')?.parentElement;
                if (listEl) {
                    listEl.querySelectorAll('.reservation').forEach(el => el.remove());
                    const toShow = myData.filter(r => r.status !== 'cancelled').slice(0, 3);
                    if (toShow.length === 0) {
                        const p = document.createElement('p');
                        p.style.cssText = 'color:#999;font-size:14px;margin-top:12px;';
                        p.textContent = 'No upcoming reservations.';
                        listEl.appendChild(p);
                    } else {
                        toShow.forEach(r => {
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
                }
            }

            /* --- Available labs --- */
            if (allRes.ok) {
                const allData  = await allRes.json();
                const today    = new Date().toISOString().split('T')[0];
                const LABS     = [
                    { key: 'gokongwei', total: 15 },
                    { key: 'andrew',    total: 15 },
                    { key: 'velasco',   total: 15 }
                ];

                const labEls = document.querySelectorAll('.card .lab');
                LABS.forEach((lab, i) => {
                    if (!labEls[i]) return;
                    /* Count seats that have at least one active reservation today */
                    const bookedSeats = new Set(
                        allData
                            .filter(r => r.lab === lab.key && r.date === today && r.status !== 'cancelled')
                            .map(r => r.seat)
                    );
                    const available = lab.total - bookedSeats.size;
                    const p = labEls[i].querySelector('p');
                    if (p) p.textContent = `${available} / ${lab.total} seats available`;
                });
            }
        } catch (err) {
            console.log('Could not load dashboard data:', err);
        }
    }
};

/* Tech Dashboard */
const TechDashboard = {
    async init() {
        await AuthUI.injectNavbar();
        const dateEl = document.getElementById('dashDate');
        if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-US',
            { weekday:'long', year:'numeric', month:'long', day:'numeric' });

        await this.loadData();
        setInterval(() => this.loadData(), 60000);
    },

    async loadData() {
        try {
            const res  = await fetch('/api/reservations');
            if (!res.ok) return;
            const data = await res.json();

            /* Stat cards */
            const confirmed = data.filter(r => r.status === 'confirmed').length;
            const pending   = data.filter(r => r.status === 'pending').length;
            const cards     = document.querySelectorAll('.stat-card h2');
            if (cards[0]) cards[0].textContent = confirmed;
            if (cards[1]) cards[1].textContent = pending;
            if (cards[2]) cards[2].textContent = data.length;

            /* Lab status bars */
            const today = new Date().toISOString().split('T')[0];
            const LABS  = [
                { key: 'gokongwei', total: 15 },
                { key: 'andrew',    total: 15 },
                { key: 'velasco',   total: 15 }
            ];

            const labEls = document.querySelectorAll('.lab');
            LABS.forEach((lab, i) => {
                if (!labEls[i]) return;
                const bookedSeats = new Set(
                    data.filter(r => r.lab === lab.key && r.date === today && r.status !== 'cancelled')
                        .map(r => r.seat)
                );
                const occupied = bookedSeats.size;
                const pct      = Math.round((occupied / lab.total) * 100);

                const header = labEls[i].querySelector('.lab-header');
                if (header) {
                    const spans = header.querySelectorAll('span');
                    if (spans[1]) spans[1].textContent = `${occupied}/${lab.total}`;
                }

                const bar = labEls[i].querySelector('.progress-fill');
                if (bar) bar.style.width = pct + '%';

                const pEl = labEls[i].querySelector('p');
                if (pEl) pEl.textContent = `${pct}% occupied`;
            });

        } catch (err) {
            console.log('Could not load tech dashboard data:', err);
        }
    }
};

/* View Slots / Book a Seat */
const ViewSlotsPage = {
    selectedSeat: null,
    selectedSlots: [],
    selectedLab: 'gokongwei',
    selectedDate: null,
    reservationsCache: [],
    currentUserId: null,
 
    ALL_SLOTS: [
        '08:00','08:30','09:00','09:30','10:00','10:30',
        '11:00','11:30','12:00','12:30','13:00','13:30',
        '14:00','14:30','15:00','15:30','16:00','16:30',
        '17:00','17:30','18:00','18:30'
    ],

    getDateString(offset = 0) {
        const d = new Date();
        d.setDate(d.getDate() + offset);
        const yyyy = d.getFullYear();
        const mm   = String(d.getMonth() + 1).padStart(2, '0');
        const dd   = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    },

    getNowTime() {
        const n = new Date();
        return String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0');
    },

    getFutureSlots(dateStr) {
        const today = this.getDateString(0);
        if (dateStr !== today) return this.ALL_SLOTS;
        const now = this.getNowTime();
        return this.ALL_SLOTS.filter(t => t > now);
    },

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
            btn.className    = 'date' + (i === 0 ? ' active' : '');
            btn.dataset.date = dateStr;
            btn.innerHTML    = `<span>${label}</span><span>${month} ${dayNum}</span>`;

            btn.addEventListener('click', () => {
                document.querySelectorAll('.date').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedDate = dateStr;
                this.selectedSeat = null;
                this.selectedSlots = [];
                this.updateSeatMap();
                // Reset panel
                const panel = document.querySelector('.seat-panel');
                if (panel) panel.innerHTML = `<h3>Select a seat</h3><p>Click any seat to see time slots.</p>`;
            });

            container.appendChild(btn);
        }
    },

    async init() {
        AuthUI.injectNavbar();

        // Get current user id for "mine" coloring
        try {
            const r = await fetch('/api/me');
            if (r.ok) {
                const u = await r.json();
                this.currentUserId = u.userId;
            }
        } catch(e) {}

        this.selectedDate = this.getDateString(0);
        this.buildDateButtons();

        const labSelect = document.querySelector('select');
        if (labSelect) {
            labSelect.addEventListener('change', () => {
                this.selectedLab   = labSelect.value;
                this.selectedSeat  = null;
                this.selectedSlots = [];
                this.loadReservations();
                const panel = document.querySelector('.seat-panel');
                if (panel) panel.innerHTML = `<h3>Select a seat</h3><p>Click any seat to see time slots.</p>`;

                const LAB_NAMES = {
                    gokongwei: { name: 'Gokongwei Lab', location: 'Gokongwei Hall • 15 seats' },
                    andrew:    { name: 'Andrew Lab',    location: 'Andrew Building • 15 seats' },
                    velasco:   { name: 'Velasco Lab',   location: 'Velasco Hall • 15 seats' }
                };
                const info = LAB_NAMES[labSelect.value];
                if (info) {
                    const labInfoDiv = document.querySelector('.lab-info');
                    if (labInfoDiv) {
                        const h3 = labInfoDiv.querySelector('h3');
                        const p  = labInfoDiv.querySelector('p');
                        if (h3) h3.textContent = info.name;
                        if (p)  p.textContent  = info.location;
                    }
                }
            });
        }

        // ALL seats are always clickable — color and panel content handle state
        document.querySelectorAll('.seats .seat').forEach(seat => {
            seat.addEventListener('click', function () {
                if (this.classList.contains('blocked')) return;
                document.querySelectorAll('.seats .seat').forEach(s => s.classList.remove('selected-seat'));
                this.classList.add('selected-seat');
                ViewSlotsPage.selectedSeat   = parseInt(this.textContent);
                ViewSlotsPage.selectedSlots  = [];
                ViewSlotsPage.showSlotPanel();
            });
        });

        // Load then auto-refresh every 60 s
        await this.loadReservations();
        setInterval(() => this.loadReservations(), 60000);
    },

    async loadReservations() {
        try {
            const res = await fetch('/api/reservations');
            if (!res.ok) return;
            this.reservationsCache = await res.json();
            this.updateSeatMap();
            this.updateSummaryPanel();
            // Refresh panel if a seat is selected
            if (this.selectedSeat !== null) this.showSlotPanel();
        } catch(e) {}
    },

    updateSeatMap() {
        const recs = this.reservationsCache.filter(r =>
            r.lab    === this.selectedLab &&
            r.date   === this.selectedDate &&
            r.status !== 'cancelled'
        );

        document.querySelectorAll('.seats .seat').forEach(seatEl => {
            // Skip manually blocked seats
            if (seatEl.dataset.blocked === 'true') return;

            const seatNum = parseInt(seatEl.textContent);

            // All reservations for this seat on this date
            const seatRecs = recs.filter(r => r.seat === seatNum);

            // Collect all booked slot strings for this seat
            const bookedSlots = new Set();
            let   hasMyRec    = false;

            seatRecs.forEach(r => {
                r.slots.forEach(s => bookedSlots.add(s));
                if (r.userId && (r.userId._id || r.userId).toString() === this.currentUserId) {
                    hasMyRec = true;
                }
            });

            // Future slots (for today, only future ones count)
            const futureSlots = this.getFutureSlots(this.selectedDate);

            // A slot is "effectively available" if it's a future slot and not booked
            const hasAvailableSlot = futureSlots.some(s => !bookedSlots.has(s));

            // Remove all state classes first
            seatEl.classList.remove('available', 'reserved', 'mine', 'selected-seat');

            if (hasMyRec) {
                seatEl.classList.add('mine');       // blue-you have a reservation on this seat
            } else if (!hasAvailableSlot) {
                seatEl.classList.add('reserved');   // red-fully booked
            } else {
                seatEl.classList.add('available');  // green-at least one slot free
            }
        });
    },

    updateSummaryPanel() {
        const today    = this.selectedDate;
        const recs     = this.reservationsCache.filter(r =>
            r.lab === this.selectedLab && r.date === today && r.status !== 'cancelled'
        );

        const LAB_TOTALS = { gokongwei: 15, andrew: 15, velasco: 15 };
        const total      = LAB_TOTALS[this.selectedLab] || 15;

        const bookedSeats  = new Set(recs.map(r => r.seat));
        const reservedCount = bookedSeats.size;
        const availableCount = total - reservedCount;

        const items = document.querySelectorAll('.summary-item span:last-child');
        if (items[0]) items[0].textContent = availableCount;
        if (items[1]) items[1].textContent = reservedCount;
        // Blocked stays static (data-blocked seats)
        const blockedCount = document.querySelectorAll('.seats .seat[data-blocked="true"]').length;
        if (items[2]) items[2].textContent = blockedCount;
    },

    showSlotPanel() {
        const panel = document.querySelector('.seat-panel');
        if (!panel) return;

        const futureSlots = this.getFutureSlots(this.selectedDate);
        const isToday     = this.selectedDate === this.getDateString(0);

        // Reservations for this exact seat/lab/date
        const seatRecs = this.reservationsCache.filter(r =>
            r.lab    === this.selectedLab &&
            r.seat   === this.selectedSeat &&
            r.date   === this.selectedDate &&
            r.status !== 'cancelled'
        );

        // Map slot → { name, userId } for taken slots
        const takenSlots = {};
        seatRecs.forEach(r => {
            const name = r.anonymous ? 'Anonymous' : (r.userId?.name || 'Someone');
            const uid  = r.anonymous ? null : (r.userId?._id || r.userId);
            r.slots.forEach(s => { takenSlots[s] = { name, uid }; });
        });

        // Check if every future slot is taken — show info but no booking form
        const allFutureTaken = futureSlots.length > 0 && futureSlots.every(s => takenSlots[s]);

        if (isToday && futureSlots.length === 0) {
            panel.innerHTML = `
                <h3>Seat ${this.selectedSeat}</h3>
                <p style="font-size:13px;color:#dc2626;margin:12px 0;
                           background:#fee2e2;padding:10px;border-radius:8px;">
                    No more available time slots for today.<br>
                    Please select a future date to book.
                </p>`;
            return;
        }

        // Build slot buttons
        const slotButtons = this.ALL_SLOTS.map(t => {
            const isPast  = isToday && !futureSlots.includes(t);
            const isTaken = !!takenSlots[t];
            const isMySlot = isTaken && takenSlots[t].uid &&
                             takenSlots[t].uid.toString() === this.currentUserId;
            const disabled = isPast || isTaken;

            let bg = 'white', border = '#ddd', color = 'inherit', cursor = 'pointer';
            let subLabel = '';

            if (isPast) {
                bg = '#f5f5f5'; border = '#f0f0f0'; color = '#bbb'; cursor = 'not-allowed';
                subLabel = `<br><span style="font-size:10px;">past</span>`;
            } else if (isTaken) {
                if (isMySlot) {
                    bg = '#dbeafe'; border = '#93c5fd'; color = '#1e40af'; cursor = 'not-allowed';
                    subLabel = `<br><span style="font-size:10px;">your booking</span>`;
                } else {
                    bg = '#fee2e2'; border = '#fecaca'; color = '#991b1b'; cursor = 'not-allowed';
                    const info  = takenSlots[t];
                    const label = info.uid
                        ? `<a href="/profile?id=${info.uid}" style="color:#991b1b;font-weight:600;text-decoration:underline;">${info.name}</a>`
                        : `<span style="color:#991b1b;font-weight:600;">${info.name}</span>`;
                    subLabel = `<br><span style="font-size:10px;">by ${label}</span>`;
                }
            }

            return `<button class="slot-btn" data-time="${t}" ${disabled ? 'disabled' : ''}
                style="padding:7px 4px;border:1px solid ${border};border-radius:6px;font-size:11px;
                       cursor:${cursor};background:${bg};color:${color};
                       line-height:1.4;text-align:center;word-break:break-word;">
                <strong>${t}</strong>${subLabel}
            </button>`;
        }).join('');

        panel.innerHTML = `
            <h3>Seat ${this.selectedSeat}</h3>
            <p style="font-size:13px;color:#666;margin:6px 0 10px;">
                ${allFutureTaken
                    ? 'All slots are taken for this date.'
                    : 'Select one or more available time slots:'}
            </p>
            ${isToday ? `<p style="font-size:11px;color:#d97706;margin-bottom:8px;">Past slots are unavailable.</p>` : ''}
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:5px;margin-bottom:12px;">
                ${slotButtons}
            </div>
            ${!allFutureTaken ? `
            <div style="margin-bottom:8px;">
                <label style="font-size:13px;color:#666;">
                    <input type="checkbox" id="anonCheck"> Book anonymously
                </label>
            </div>
            <p id="slotError" style="color:#dc2626;font-size:12px;margin-top:4px;display:none;">
                Please select at least one time slot.
            </p>
            <button id="confirmReservationBtn"
                style="background:#006B3F;color:white;padding:10px;border:none;
                       border-radius:8px;width:100%;margin-top:8px;cursor:pointer;font-size:14px;">
                Confirm Reservation
            </button>` : ''}`;

        // Wire up slot toggles
        this.selectedSlots = [];
        panel.querySelectorAll('.slot-btn:not([disabled])').forEach(btn => {
            btn.addEventListener('click', function () {
                const t = this.dataset.time;
                document.getElementById('slotError').style.display = 'none';
                if (ViewSlotsPage.selectedSlots.includes(t)) {
                    ViewSlotsPage.selectedSlots = ViewSlotsPage.selectedSlots.filter(s => s !== t);
                    this.style.background  = 'white';
                    this.style.borderColor = '#ddd';
                    this.style.color       = 'inherit';
                } else {
                    ViewSlotsPage.selectedSlots.push(t);
                    this.style.background  = '#006B3F';
                    this.style.borderColor = '#006B3F';
                    this.style.color       = 'white';
                }
            });
        });

        const confirmBtn = panel.querySelector('#confirmReservationBtn');
        if (confirmBtn) confirmBtn.addEventListener('click', () => this.submitReservation());
    },

    async submitReservation() {
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
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(body)
            });
            const data = await res.json();
            if (res.ok) {
                Utils.toast('Reservation confirmed!', 'success');
                // Reload reservations so seat map + panel update immediately
                await this.loadReservations();
                // Show booked confirmation in panel
                const panel = document.querySelector('.seat-panel');
                if (panel) panel.innerHTML = `
                    <h3>Booked</h3>
                    <p style="color:#666;font-size:13px;margin-top:8px;">
                        Seat ${this.selectedSeat} reserved for ${Utils.formatSlots(this.selectedSlots)}.
                        <br><a href="/my-reservations" style="color:#006B3F;margin-top:6px;display:inline-block;">
                            View My Reservations →
                        </a>
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
                        ${r.status !== 'cancelled' ? `
                            <button class="edit"   data-id="${r._id}">Edit</button>
                            <button class="cancel" data-id="${r._id}">Cancel</button>
                        ` : `
                            <button disabled style="color:#aaa;border-color:#eee;">Cancelled</button>
                        `}
                    </div>`;
                listEl.appendChild(card);
            });

            /* Cancel */
            listEl.querySelectorAll('.cancel').forEach(btn => {
                btn.addEventListener('click', async function () {
                    if (!confirm('Are you sure you want to cancel this reservation?')) return;
                    const id  = this.dataset.id;
                    const res = await fetch(`/api/reservations/${id}`, { method: 'DELETE' });
                    if (res.ok) {
                        Utils.toast('Reservation cancelled.', 'success');
                        MyReservationsPage.loadReservations();
                    } else {
                        const d = await res.json();
                        Utils.toast(d.message || 'Could not cancel.', 'error');
                    }
                });
            });

            /* Edit */
            listEl.querySelectorAll('.edit').forEach(btn => {
                btn.addEventListener('click', function () {
                    const id = this.dataset.id;
                    const reservation = data.find(r => r._id === id);
                    if (reservation) MyReservationsPage.showEditModal(reservation);
                });
            });

        } catch (err) {
            Utils.toast('Error loading reservations.', 'error');
        }
    },

    showEditModal(r) {
        // Remove existing modal if any
        document.getElementById('editReservationModal')?.remove();

        const ALL_SLOTS = [
            '08:00','08:30','09:00','09:30','10:00','10:30',
            '11:00','11:30','12:00','12:30','13:00','13:30',
            '14:00','14:30','15:00','15:30','16:00','16:30',
            '17:00','17:30','18:00','18:30'
        ];

        const modal = document.createElement('div');
        modal.id = 'editReservationModal';
        modal.style.cssText = `
            position:fixed;inset:0;background:rgba(0,0,0,0.5);
            display:flex;align-items:center;justify-content:center;
            z-index:9000;font-family:Inter,sans-serif;`;

        modal.innerHTML = `
            <div style="background:white;border-radius:16px;padding:28px;
                        width:480px;max-width:95vw;max-height:90vh;overflow-y:auto;
                        box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                    <h3 style="font-size:18px;font-weight:700;">Edit Reservation</h3>
                    <button id="closeEditModal"
                        style="background:none;border:none;font-size:20px;cursor:pointer;color:#666;">✕</button>
                </div>

                <div style="background:#f7f9f8;border-radius:10px;padding:12px;margin-bottom:18px;font-size:13px;color:#555;">
                    <strong>${r.lab}</strong> — Seat ${r.seat} — ${Utils.formatDate(r.date)}
                </div>

                <label style="font-size:13px;font-weight:600;color:#444;display:block;margin-bottom:8px;">
                    Time Slots <span style="font-weight:400;color:#888;">(select all that apply)</span>
                </label>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:16px;">
                    ${ALL_SLOTS.map(t => {
                        const selected = r.slots.includes(t);
                        return `<button type="button" class="edit-slot-btn"
                            data-time="${t}"
                            data-selected="${selected}"
                            style="padding:7px 4px;border-radius:6px;font-size:12px;cursor:pointer;
                                   border:1px solid ${selected ? '#006B3F' : '#ddd'};
                                   background:${selected ? '#006B3F' : 'white'};
                                   color:${selected ? 'white' : 'inherit'};">
                            ${t}
                        </button>`;
                    }).join('')}
                </div>

                <label style="font-size:13px;font-weight:600;color:#444;display:block;margin-bottom:8px;">
                    Anonymous Booking
                </label>
                <div style="margin-bottom:20px;">
                    <label style="font-size:13px;color:#666;">
                        <input type="checkbox" id="editAnonCheck" ${r.anonymous ? 'checked' : ''}>
                        Book anonymously
                    </label>
                </div>

                <p id="editSlotError" style="color:#dc2626;font-size:12px;margin-bottom:8px;display:none;">
                    Please select at least one time slot.
                </p>

                <div style="display:flex;gap:10px;">
                    <button id="saveEditBtn"
                        style="flex:1;background:#006B3F;color:white;border:none;
                               padding:11px;border-radius:10px;font-size:14px;
                               font-weight:600;cursor:pointer;">
                        Save Changes
                    </button>
                    <button id="cancelEditModalBtn"
                        style="flex:1;background:white;border:1px solid #ddd;
                               padding:11px;border-radius:10px;font-size:14px;cursor:pointer;">
                        Cancel
                    </button>
                </div>
            </div>`;

        document.body.appendChild(modal);

        /* Slot toggles */
        modal.querySelectorAll('.edit-slot-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const isSelected = this.dataset.selected === 'true';
                this.dataset.selected = isSelected ? 'false' : 'true';
                this.style.background  = isSelected ? 'white'   : '#006B3F';
                this.style.borderColor = isSelected ? '#ddd'    : '#006B3F';
                this.style.color       = isSelected ? 'inherit' : 'white';
                document.getElementById('editSlotError').style.display = 'none';
            });
        });

        /* Close */
        modal.querySelector('#closeEditModal').addEventListener('click', () => modal.remove());
        modal.querySelector('#cancelEditModalBtn').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

        /* Save */
        modal.querySelector('#saveEditBtn').addEventListener('click', async () => {
            const newSlots = [...modal.querySelectorAll('.edit-slot-btn[data-selected="true"]')]
                .map(b => b.dataset.time);

            if (newSlots.length === 0) {
                document.getElementById('editSlotError').style.display = 'block';
                return;
            }

            const anonymous = document.getElementById('editAnonCheck').checked;

            const res = await fetch(`/api/reservations/${r._id}/edit`, {
                method:  'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ slots: newSlots, anonymous })
            });

            if (res.ok) {
                Utils.toast('Reservation updated.', 'success');
                modal.remove();
                MyReservationsPage.loadReservations();
            } else {
                const d = await res.json();
                Utils.toast(d.message || 'Could not update.', 'error');
            }
        });
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
    reservations: [],

    ALL_SLOTS: [
        '08:00','08:30','09:00','09:30','10:00','10:30',
        '11:00','11:30','12:00','12:30','13:00','13:30',
        '14:00','14:30','15:00','15:30','16:00','16:30',
        '17:00','17:30','18:00','18:30'
    ],

    LABS: ['gokongwei', 'andrew', 'velasco'],

    getDateString(offset = 0) {
        const d = new Date();
        d.setDate(d.getDate() + offset);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    },

    formatDateLabel(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
    },

    async init() {
        AuthUI.injectNavbar();
        this.buildDateDropdown();
        this.buildTimeDropdowns();

        // Load all reservations once for filtering
        try {
            const res = await fetch('/api/reservations');
            if (res.ok) this.reservations = await res.json();
        } catch(e) {}

        // Run a default search on load to show all available slots today
        this.runSearch();

        const searchBtn = document.querySelector('.search-btn');
        if (searchBtn) searchBtn.addEventListener('click', () => this.runSearch());
    },

    buildDateDropdown() {
        const sel = document.querySelectorAll('.field select')[1];
        if (!sel) return;
        sel.innerHTML = '<option value="">Any date (next 7 days)</option>';
        for (let i = 0; i < 7; i++) {
            const dateStr = this.getDateString(i);
            const label   = i === 0
                ? `Today, ${this.formatDateLabel(dateStr)}`
                : this.formatDateLabel(dateStr);
            const opt = document.createElement('option');
            opt.value       = dateStr;
            opt.textContent = label;
            sel.appendChild(opt);
        }
    },

    buildTimeDropdowns() {
        const fromSel = document.querySelectorAll('.field select')[2];
        const toSel   = document.querySelectorAll('.field select')[3];
        if (!fromSel || !toSel) return;

        fromSel.innerHTML = '<option value="">Any time</option>';
        toSel.innerHTML   = '<option value="">Any time</option>';

        this.ALL_SLOTS.forEach(t => {
            fromSel.innerHTML += `<option value="${t}">${t}</option>`;
            toSel.innerHTML   += `<option value="${t}">${t}</option>`;
        });
    },

    runSearch() {
        const labSel    = document.querySelectorAll('.field select')[0];
        const dateSel   = document.querySelectorAll('.field select')[1];
        const fromSel   = document.querySelectorAll('.field select')[2];
        const toSel     = document.querySelectorAll('.field select')[3];

        const labFilter  = labSel?.value  || '';
        const dateFilter = dateSel?.value || '';
        const fromFilter = fromSel?.value || '';
        const toFilter   = toSel?.value   || '';

        // Validate time range
        if (fromFilter && toFilter && fromFilter >= toFilter) {
            Utils.toast('"From Time" must be earlier than "Until Time".', 'error');
            return;
        }

        // Determine which dates to search
        const dates = dateFilter
            ? [dateFilter]
            : Array.from({ length: 7 }, (_, i) => this.getDateString(i));

        // Determine which labs to search
        const labs = labFilter && labFilter !== 'All Labs'
            ? [labFilter.toLowerCase()]
            : this.LABS;

        // Determine which slots fall within the time filter
        const slotsInRange = this.ALL_SLOTS.filter(t => {
            if (fromFilter && t < fromFilter) return false;
            if (toFilter   && t >= toFilter)  return false;
            return true;
        });

        if (slotsInRange.length === 0) {
            this.renderResults([]);
            return;
        }

        // Build results: for each date+lab, find seats with at least one free slot
        const results = [];

        dates.forEach(dateStr => {
            labs.forEach(lab => {
                // Reservations for this lab+date
                const labRecs = this.reservations.filter(r =>
                    r.lab === lab &&
                    r.date === dateStr &&
                    r.status !== 'cancelled'
                );

                // All booked slots per seat
                const bookedBySeat = {};
                labRecs.forEach(r => {
                    if (!bookedBySeat[r.seat]) bookedBySeat[r.seat] = new Set();
                    r.slots.forEach(s => bookedBySeat[r.seat].add(s));
                });

                // Seats 1–15 (adjust if your labs have different counts)
                const seatCount = lab === 'gokongwei' ? 15 : lab === 'andrew' ? 15 : 15;
                const freeSeats = [];

                for (let seat = 1; seat <= seatCount; seat++) {
                    const booked     = bookedBySeat[seat] || new Set();
                    const freeSlots  = slotsInRange.filter(s => !booked.has(s));
                    if (freeSlots.length > 0) {
                        freeSeats.push({ seat, freeSlots });
                    }
                }

                if (freeSeats.length > 0) {
                    results.push({ dateStr, lab, freeSeats });
                }
            });
        });

        this.renderResults(results);
    },

    renderResults(results) {
        // Update count
        const countEl = document.querySelector('.results-header p b');
        const totalFreeSeats = results.reduce((sum, r) => sum + r.freeSeats.length, 0);
        if (countEl) countEl.textContent = totalFreeSeats;

        // Find or create results container
        let container = document.getElementById('searchResultsContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'searchResultsContainer';
            document.querySelector('.results-header')?.insertAdjacentElement('afterend', container);
        }
        container.innerHTML = '';

        if (results.length === 0) {
            container.innerHTML = `
                <div class="empty">
                    <h3>No available slots found</h3>
                    <p>Try adjusting your filters or choosing another date.</p>
                </div>`;
            return;
        }

        // Group by date
        const byDate = {};
        results.forEach(r => {
            if (!byDate[r.dateStr]) byDate[r.dateStr] = [];
            byDate[r.dateStr].push(r);
        });

        Object.entries(byDate).forEach(([dateStr, labGroups]) => {
            const dateGroup = document.createElement('div');
            dateGroup.className = 'date-group';
            dateGroup.innerHTML = `<div class="date-label">${this.formatDateLabel(dateStr)}</div>`;

            labGroups.forEach(({ lab, freeSeats }) => {
                const labCard = document.createElement('div');
                labCard.className = 'lab-card';
                labCard.style.marginBottom = '14px';

                const labName = lab.charAt(0).toUpperCase() + lab.slice(1) + ' Lab';
                labCard.innerHTML = `
                    <div class="lab-header">
                        <div><b>${labName}</b></div>
                        <div class="available">${freeSeats.length} seat${freeSeats.length !== 1 ? 's' : ''} available</div>
                    </div>
                    <div class="seats">
                        ${freeSeats.map(({ seat, freeSlots }) => `
                            <div class="seat-result">
                                <div class="seat-num">${seat}</div>
                                <div class="seat-info">
                                    <p>Seat ${seat}</p>
                                    <span>${freeSlots.length} slot${freeSlots.length !== 1 ? 's' : ''} free
                                        (${freeSlots[0]}–${(() => {
                                            const last = freeSlots[freeSlots.length - 1];
                                            const [h, m] = last.split(':').map(Number);
                                            const end = new Date(0,0,0,h,m+30);
                                            return String(end.getHours()).padStart(2,'0') + ':' + String(end.getMinutes()).padStart(2,'0');
                                        })()})
                                    </span>
                                </div>
                                <button class="reserve"
                                    onclick="window.location='/view-slots'"
                                    title="Go to booking page">
                                    Reserve →
                                </button>
                            </div>`).join('')}
                    </div>`;

                dateGroup.appendChild(labCard);
            });

            container.appendChild(dateGroup);
        });
    }
};
 
/* Profile */
const ProfilePage = {
    async init() {
        await AuthUI.injectNavbar();

        // Check if viewing someone else's profile via ?id=
        const params   = new URLSearchParams(window.location.search);
        const viewingId = params.get('id');

        if (viewingId) {
            await this.loadPublicProfile(viewingId);
        } else {
            await this.loadOwnProfile();
        }
    },

    /* ── PUBLIC (read-only) view ── */
    async loadPublicProfile(userId) {
        try {
            const res = await fetch(`/api/profile/${userId}`);
            if (!res.ok) {
                document.body.innerHTML += `<p style="padding:40px;color:#666;">Profile not found.</p>`;
                return;
            }
            const profile = await res.json();
            this.renderPublicProfile(profile);
        } catch(e) {
            console.log('Public profile error:', e);
        }
    },

    renderPublicProfile(profile) {
        const container = document.querySelector('.container');
        if (!container) return;

        // Hide success banner
        const banner = document.querySelector('.success');
        if (banner) banner.style.display = 'none';

        container.innerHTML = `
            <div class="header">
                <h1>User Profile</h1>
                <p>Public view</p>
            </div>
            <div class="grid">
                <div class="left">
                    <div class="card profile-card">
                        <div class="avatar" style="background:${profile.avatarColor || '#006B3F'};">
                            ${profile.name ? profile.name[0].toUpperCase() : '?'}
                        </div>
                        <h2>${profile.name || '—'}</h2>
                        <p class="email">${profile.email || '—'}</p>
                        <div class="role">${profile.role || 'student'}</div>
                    </div>
                </div>
                <div class="right">
                    <div class="card">
                        <div class="card-header"><h3>About</h3></div>
                        <div class="field">
                            <label>Bio</label>
                            <div class="value">${profile.bio || 'No bio provided.'}</div>
                        </div>
                    </div>
                </div>
            </div>`;
    },

    /* ── OWN profile (editable) ── */
    async loadOwnProfile() {
        const successBanner = document.querySelector('.success');
        if (successBanner) successBanner.style.display = 'none';

        try {
            const [meRes, profileRes, resRes] = await Promise.all([
                fetch('/api/me'),
                fetch('/api/profile'),
                fetch('/api/my-reservations')
            ]);

            if (!meRes.ok || !profileRes.ok) return;

            const profile      = await profileRes.json();
            const reservations = resRes.ok ? await resRes.json() : [];

            this.renderOwnProfile(profile, reservations);
        } catch(err) {
            console.log('Profile load error:', err);
        }
    },

    renderOwnProfile(profile, reservations) {
        /* Avatar */
        const avatarEl = document.querySelector('.avatar');
        if (avatarEl) {
            avatarEl.textContent = profile.name ? profile.name[0].toUpperCase() : '?';
            avatarEl.style.background = profile.avatarColor || '#006B3F';
        }

        /* Avatar color picker */
        const COLORS = ['#006B3F','#1d4ed8','#7c3aed','#db2777','#d97706','#0891b2'];
        const colorContainer = document.querySelector('.avatar-colors');
        if (colorContainer) {
            colorContainer.innerHTML = '';
            COLORS.forEach(color => {
                const dot = document.createElement('div');
                dot.style.cssText = `width:18px;height:18px;border-radius:50%;background:${color};
                    cursor:pointer;border:2px solid ${profile.avatarColor === color ? '#111' : 'transparent'};
                    transition:border-color 0.2s;`;
                dot.title = color;
                dot.addEventListener('click', async () => {
                    // Update avatar color immediately
                    if (avatarEl) avatarEl.style.background = color;
                    colorContainer.querySelectorAll('div').forEach(d => d.style.borderColor = 'transparent');
                    dot.style.borderColor = '#111';
                    await fetch('/api/profile', {
                        method:  'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body:    JSON.stringify({ avatarColor: color })
                    });
                });
                colorContainer.appendChild(dot);
            });
        }

        /* Name / email / role */
        document.querySelectorAll('.profile-card h2').forEach(el => el.textContent = profile.name || '');
        document.querySelectorAll('.profile-card .email').forEach(el => el.textContent = profile.email || '');
        document.querySelectorAll('.profile-card .role').forEach(el => el.textContent = profile.role || '');

        /* Info fields */
        const values = document.querySelectorAll('.value');
        if (values[0]) values[0].textContent = profile.name  || '—';
        if (values[1]) values[1].textContent = profile.email || '—';
        if (values[2]) values[2].textContent = profile.role  || '—';
        if (values[3]) values[3].textContent = profile.bio   || '—';

        /* Account stats */
        const stats = document.querySelectorAll('.stat b');
        const active = reservations.filter(r => r.status !== 'cancelled');
        const confirmed = reservations.filter(r => r.status === 'confirmed');
        if (stats[0]) stats[0].textContent = reservations.length;
        if (stats[1]) stats[1].textContent = confirmed.length;
        if (stats[2]) stats[2].textContent = active.length;

        /* Current reservations list */
        const resContainer = document.querySelector('.card .reservation')?.parentElement ||
                             document.querySelectorAll('.card')[2];
        if (resContainer) {
            resContainer.querySelectorAll('.reservation').forEach(el => el.remove());
            const header = resContainer.querySelector('.card-header');

            // Update "View all" link
            const viewAll = resContainer.querySelector('.card-header a');
            if (viewAll) viewAll.href = '/my-reservations';

            const activeRes = reservations.filter(r => r.status !== 'cancelled').slice(0, 3);
            if (activeRes.length === 0) {
                const empty = document.createElement('p');
                empty.style.cssText = 'color:#999;font-size:14px;margin-top:10px;';
                empty.textContent = 'No active reservations.';
                resContainer.appendChild(empty);
            } else {
                activeRes.forEach(r => {
                    const div = document.createElement('div');
                    div.className = 'reservation';
                    div.innerHTML = `
                        <div class="seat">${r.seat}</div>
                        <div class="res-info">
                            <p>${r.lab} – Seat ${r.seat}</p>
                            <span>${Utils.formatDate(r.date)} • ${Utils.formatSlots(r.slots)}</span>
                        </div>
                        <div class="status ${r.status}">${r.status}</div>`;
                    resContainer.appendChild(div);
                });
            }
        }

        /* Edit button */
        const editBtn = document.querySelector('.edit-btn');
        if (editBtn) editBtn.addEventListener('click', () => this.showEditForm(profile));

        /* Delete account */
        const deleteBtn = document.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                if (!confirm('This will permanently delete your account and cancel all reservations. Are you sure?')) return;
                const res = await fetch('/api/profile', { method: 'DELETE' });
                if (res.ok) {
                    Utils.toast('Account deleted.', 'success');
                    setTimeout(() => window.location.href = '/', 2000);
                } else {
                    Utils.toast('Could not delete account.', 'error');
                }
            });
        }
    },

    showEditForm(profile) {
        const infoCard = Array.from(document.querySelectorAll('.card'))
            .find(c => c.querySelector('.card-header h3')?.textContent === 'Profile Information');
        if (!infoCard) return;

        const nameVal = infoCard.querySelectorAll('.value')[0]?.textContent || '';
        const bioVal  = infoCard.querySelectorAll('.value')[3]?.textContent || '';

        infoCard.innerHTML = `
            <h3 style="margin-bottom:15px;">Edit Profile</h3>
            <div class="form-group" style="margin-bottom:12px;">
                <label style="font-size:13px;color:#777;">Full Name</label>
                <input id="editName" value="${nameVal !== '—' ? nameVal : ''}"
                    style="width:100%;padding:10px;border:1px solid #ddd;border-radius:10px;margin-top:4px;
                           font-size:14px;font-family:Inter,sans-serif;">
            </div>
            <div class="form-group" style="margin-bottom:16px;">
                <label style="font-size:13px;color:#777;">Bio / Description</label>
                <textarea id="editBio" rows="4"
                    style="width:100%;padding:10px;border:1px solid #ddd;border-radius:10px;margin-top:4px;
                           resize:vertical;font-size:14px;font-family:Inter,sans-serif;">${bioVal !== '—' ? bioVal : ''}</textarea>
                <small style="color:#aaa;font-size:11px;">Max 500 characters</small>
            </div>
            <div style="display:flex;gap:10px;">
                <button id="saveProfileBtn"
                    style="background:#006B3F;color:white;border:none;padding:10px 16px;
                           border-radius:10px;cursor:pointer;font-size:14px;font-weight:600;">
                    Save Changes
                </button>
                <button id="cancelEditBtn"
                    style="border:1px solid #ddd;background:white;padding:10px 16px;
                           border-radius:10px;cursor:pointer;font-size:14px;">
                    Cancel
                </button>
            </div>`;

        const nameInput = document.getElementById('editName');
        const bioInput  = document.getElementById('editBio');

        /* Character counter */
        bioInput.addEventListener('input', () => {
            const small = infoCard.querySelector('small');
            const left  = 500 - bioInput.value.length;
            if (small) {
                small.textContent  = `${left} characters remaining`;
                small.style.color  = left < 50 ? '#dc2626' : '#aaa';
            }
        });

        Utils.liveValidate(nameInput, [
            { test: v => v.trim() !== '',      msg: 'Name cannot be empty.' },
            { test: v => v.trim().length >= 2, msg: 'Name must be at least 2 characters.' }
        ]);

        document.getElementById('saveProfileBtn').addEventListener('click', async () => {
            const name = nameInput.value.trim();
            const bio  = bioInput.value.trim();

            if (!name) { Utils.setFieldError(nameInput, 'Name cannot be empty.'); return; }
            if (name.length < 2) { Utils.setFieldError(nameInput, 'Name must be at least 2 characters.'); return; }
            if (bio.length > 500) { Utils.toast('Bio must not exceed 500 characters.', 'error'); return; }

            const res = await fetch('/api/profile', {
                method:  'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ name, bio })
            });

            if (res.ok) {
                Utils.toast('Profile updated!', 'success');
                setTimeout(() => window.location.reload(), 1000);
            } else {
                const d = await res.json();
                Utils.toast(d.message || 'Could not update profile.', 'error');
            }
        });

        document.getElementById('cancelEditBtn').addEventListener('click', () => window.location.reload());
    }
};

/* Reserve for Student (Tech) */
const ReserveStudentPage = {
    selectedStudent: null,
    selectedLab:     'gokongwei',
    selectedDate:    null,
    selectedSeat:    null,
    selectedSlots:   [],

    ALL_SLOTS: [
        '08:00','08:30','09:00','09:30','10:00','10:30',
        '11:00','11:30','12:00','12:30','13:00','13:30',
        '14:00','14:30','15:00','15:30','16:00','16:30',
        '17:00','17:30','18:00','18:30'
    ],

    getDateString(offset = 0) {
        const d = new Date();
        d.setDate(d.getDate() + offset);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    },

    async init() {
        await AuthUI.injectNavbar();
        this.selectedDate = this.getDateString(0);

        await this.loadStudents();
        this.buildDateButtons();
        this.bindLabButtons();
        this.bindSeatButtons();
        this.bindSlotButtons();
        this.bindConfirm();

        // Hide static success banner
        const banner = document.querySelector('.success');
        if (banner) banner.style.display = 'none';

        // Hide modal on load
        const modal = document.querySelector('.modal');
        if (modal) modal.style.display = 'none';
    },

    async loadStudents() {
        try {
            const res  = await fetch('/api/students');
            if (!res.ok) return;
            const students = await res.json();

            const listEl = document.querySelector('.student-list');
            if (!listEl) return;
            listEl.innerHTML = '';

            students.forEach(s => {
                const div = document.createElement('div');
                div.className  = 'student';
                div.dataset.id = s._id;
                div.innerHTML  = `
                    <div class="avatar" style="background:${s.avatarColor || '#006B3F'};">
                        ${s.name[0].toUpperCase()}
                    </div>
                    <div class="info">
                        <p>${s.name}</p>
                        <span>${s.email}</span>
                    </div>
                    <span class="check" style="display:none;">✓</span>`;

                div.addEventListener('click', () => {
                    document.querySelectorAll('.student-list .student').forEach(el => {
                        el.classList.remove('selected');
                        el.querySelector('.check').style.display = 'none';
                    });
                    div.classList.add('selected');
                    div.querySelector('.check').style.display = 'block';
                    this.selectedStudent = { id: s._id, name: s.name, email: s.email };
                    this.updateSummary();
                });

                listEl.appendChild(div);
            });

            /* Wire up student search */
            const searchInput = document.querySelector('.search input');
            if (searchInput) {
                searchInput.addEventListener('input', () => {
                    const q = searchInput.value.toLowerCase();
                    listEl.querySelectorAll('.student').forEach(el => {
                        const text = el.textContent.toLowerCase();
                        el.style.display = text.includes(q) ? '' : 'none';
                    });
                });
            }
        } catch(e) {
            console.log('Could not load students:', e);
        }
    },

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

            const btn = document.createElement('button');
            btn.className    = 'date' + (i === 0 ? ' active' : '');
            btn.dataset.date = dateStr;
            btn.innerHTML    = `<span>${label}</span><span>${MON_LABELS[d.getMonth()]} ${d.getDate()}</span>`;

            btn.addEventListener('click', () => {
                document.querySelectorAll('.dates .date').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedDate  = dateStr;
                this.selectedSeat  = null;
                this.selectedSlots = [];
                this.updateSummary();
            });

            container.appendChild(btn);
        }
    },

    bindLabButtons() {
        document.querySelectorAll('.labs .lab').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.labs .lab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedLab   = btn.textContent.trim().toLowerCase();
                this.selectedSeat  = null;
                this.selectedSlots = [];
                this.updateSummary();
            });
        });
    },

    bindSeatButtons() {
        document.querySelectorAll('.seats .seat').forEach(btn => {
            btn.addEventListener('click', function () {
                if (this.classList.contains('blocked') || this.classList.contains('reserved')) return;
                document.querySelectorAll('.seats .seat').forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');
                ReserveStudentPage.selectedSeat  = parseInt(this.textContent);
                ReserveStudentPage.selectedSlots = [];
                // Deselect all slot buttons
                document.querySelectorAll('.slots .slot').forEach(s => {
                    s.classList.remove('selected');
                });
                ReserveStudentPage.updateSummary();
            });
        });
    },

    bindSlotButtons() {
        document.querySelectorAll('.slots .slot').forEach(btn => {
            btn.addEventListener('click', function () {
                if (this.classList.contains('reserved')) return;
                const t = this.textContent.trim();
                if (ReserveStudentPage.selectedSlots.includes(t)) {
                    ReserveStudentPage.selectedSlots = ReserveStudentPage.selectedSlots.filter(s => s !== t);
                    this.classList.remove('selected');
                } else {
                    ReserveStudentPage.selectedSlots.push(t);
                    this.classList.add('selected');
                }
                ReserveStudentPage.updateSummary();
            });
        });
    },

    bindConfirm() {
        /* Summary confirm button */
        const confirmBtn = document.querySelector('.confirm-btn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.showConfirmModal());
        }

        /* Modal buttons */
        const modalConfirm = document.querySelector('.modal .confirm');
        if (modalConfirm) {
            modalConfirm.addEventListener('click', () => this.submitReservation());
        }

        const modalCancel = document.querySelector('.modal .cancel');
        if (modalCancel) {
            modalCancel.addEventListener('click', () => {
                const modal = document.querySelector('.modal');
                if (modal) modal.style.display = 'none';
            });
        }
    },

    updateSummary() {
        /* Summary grid values */
        const cells = document.querySelectorAll('.summary-grid > div > b');
        if (cells[0]) cells[0].textContent = this.selectedStudent?.name || '—';
        if (cells[1]) cells[1].textContent = this.selectedLab            || '—';
        if (cells[2]) cells[2].textContent = this.selectedSeat ? `Seat ${this.selectedSeat}` : '—';
        if (cells[3]) cells[3].textContent = this.selectedDate ? Utils.formatDate(this.selectedDate) : '—';

        /* Time tags */
        const tagsEl = document.querySelector('.time-tags');
        if (tagsEl) {
            tagsEl.innerHTML = this.selectedSlots.length
                ? this.selectedSlots.map(t => `<span>${t}</span>`).join('')
                : '<span style="color:#aaa;background:#f5f5f5;">No slots selected</span>';
        }

        /* Confirm button label */
        const confirmBtn = document.querySelector('.confirm-btn');
        if (confirmBtn) {
            confirmBtn.textContent = this.selectedStudent
                ? `Confirm Reservation for ${this.selectedStudent.name}`
                : 'Confirm Reservation';
        }
    },

    showConfirmModal() {
        /* Validate */
        if (!this.selectedStudent) { Utils.toast('Please select a student.', 'error'); return; }
        if (!this.selectedSeat)    { Utils.toast('Please select a seat.', 'error');    return; }
        if (this.selectedSlots.length === 0) { Utils.toast('Please select at least one time slot.', 'error'); return; }

        const modal = document.querySelector('.modal');
        if (!modal) return;

        /* Populate modal */
        const avatarEl = modal.querySelector('.student-modal .avatar');
        if (avatarEl) avatarEl.textContent = this.selectedStudent.name[0].toUpperCase();

        const nameEl  = modal.querySelector('.student-modal p');
        const emailEl = modal.querySelector('.student-modal span');
        if (nameEl)  nameEl.textContent  = this.selectedStudent.name;
        if (emailEl) emailEl.textContent = this.selectedStudent.email;

        const infoDivs = modal.querySelectorAll('.modal-info div b');
        if (infoDivs[0]) infoDivs[0].textContent = this.selectedLab;
        if (infoDivs[1]) infoDivs[1].textContent = `Seat ${this.selectedSeat}`;
        if (infoDivs[2]) infoDivs[2].textContent = Utils.formatDate(this.selectedDate);
        if (infoDivs[3]) infoDivs[3].textContent = `${this.selectedSlots.length} slot(s): ${this.selectedSlots.join(', ')}`;

        modal.style.display = 'flex';
    },

    async submitReservation() {
        try {
            const res = await fetch('/api/reservations/for-student', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    studentId: this.selectedStudent.id,
                    lab:       this.selectedLab,
                    seat:      this.selectedSeat,
                    date:      this.selectedDate,
                    slots:     this.selectedSlots,
                    anonymous: false
                })
            });
            const data = await res.json();

            const modal = document.querySelector('.modal');
            if (modal) modal.style.display = 'none';

            if (res.ok) {
                Utils.toast(`Reservation created for ${this.selectedStudent.name}!`, 'success');
                const banner = document.querySelector('.success');
                if (banner) {
                    banner.textContent = `Reservation created for ${this.selectedStudent.name} — Seat ${this.selectedSeat} on ${Utils.formatDate(this.selectedDate)}.`;
                    banner.style.display = 'block';
                }
                // Reset
                this.selectedStudent = null;
                this.selectedSeat    = null;
                this.selectedSlots   = [];
                this.updateSummary();
            } else {
                Utils.toast(data.message || 'Could not create reservation.', 'error');
            }
        } catch(e) {
            Utils.toast('Server error. Please try again.', 'error');
        }
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
    else if (path.includes('reserve-student'))      ReserveStudentPage.init();
    else if (path.includes('profile'))              ProfilePage.init();
});