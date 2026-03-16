/* 1. DATA STORE  (localStorage-backed, in-memory fallback) */
const Store = (() => {
    const KEYS = {
        users: 'animolabs_users',
        reservations: 'animolabs_reservations',
        session: 'animolabs_session',
        remember: 'animolabs_remember',
    };

    const SEED_USERS = [
        {
            id: 'u1',
            name: 'Juan Dela Cruz',
            email: 'juan.delacruz@dlsu.edu',
            password: 'password123',
            role: 'student',
            bio: 'CS student who loves coding.',
            avatar: 'J',
            avatarColor: '#006B3F',
            createdAt: '2026-01-10',
        },
        {
            id: 'u2',
            name: 'Carlos Reyes',
            email: 'carlos.reyes@dlsu.edu',
            password: 'password123',
            role: 'technician',
            bio: 'Lab technician at DLSU.',
            avatar: 'C',
            avatarColor: '#1d4ed8',
            createdAt: '2026-01-05',
        },
        {
            id: 'u3',
            name: 'Maria Santos',
            email: 'maria.santos@dlsu.edu',
            password: 'password123',
            role: 'student',
            bio: 'Biology student.',
            avatar: 'M',
            avatarColor: '#7c3aed',
            createdAt: '2026-01-12',
        },
    ];

    const LABS = [
        { id: 'gokongwei', name: 'Gokongwei Lab', location: 'Gokongwei Hall', seats: 40 },
        { id: 'andrew', name: 'Andrew Lab', location: 'Andrew Building', seats: 30 },
        { id: 'velasco', name: 'Velasco Lab', location: 'Velasco Hall', seats: 25 },
    ];

    function getUsers() {
        const raw = localStorage.getItem(KEYS.users);
        if (!raw) {
            localStorage.setItem(KEYS.users, JSON.stringify(SEED_USERS));
            return [...SEED_USERS];
        }
        return JSON.parse(raw);
    }

    function saveUsers(users) {
        localStorage.setItem(KEYS.users, JSON.stringify(users));
    }

    function getReservations() {
        const raw = localStorage.getItem(KEYS.reservations);
        if (!raw) {
            const seed = generateSeedReservations();
            localStorage.setItem(KEYS.reservations, JSON.stringify(seed));
            return seed;
        }
        return JSON.parse(raw);
    }

    function saveReservations(res) {
        localStorage.setItem(KEYS.reservations, JSON.stringify(res));
    }

    function generateSeedReservations() {
        const today = new Date();
        const fmt = (d) => d.toISOString().split('T')[0];
        const d1 = fmt(today);
        const d2 = fmt(new Date(today.getTime() + 86400000));
        const d3 = fmt(new Date(today.getTime() + 2 * 86400000));

        return [
            {
                id: 'r1', userId: 'u1', lab: 'gokongwei', seat: 12,
                date: d1, slots: ['10:00', '10:30'],
                status: 'confirmed', anonymous: false,
                bookedAt: '2026-02-20', note: '',
            },
            {
                id: 'r2', userId: 'u1', lab: 'andrew', seat: 8,
                date: d2, slots: ['14:00', '14:30'],
                status: 'pending', anonymous: false,
                bookedAt: '2026-02-21', note: '',
            },
            {
                id: 'r3', userId: 'u3', lab: 'velasco', seat: 5,
                date: d1, slots: ['12:00', '12:30'],
                status: 'confirmed', anonymous: true,
                bookedAt: '2026-02-19', note: '',
            },
            {
                id: 'r4', userId: 'u3', lab: 'gokongwei', seat: 21,
                date: d3, slots: ['15:00', '15:30'],
                status: 'cancelled', anonymous: false,
                bookedAt: '2026-02-18', note: '',
            },
            {
                id: 'r5', userId: 'u1', lab: 'gokongwei', seat: 3,
                date: d2, slots: ['09:00', '09:30'],
                status: 'confirmed', anonymous: false,
                bookedAt: '2026-02-22', note: '',
            },
        ];
    }

    /* ---- session ---- */
    function getSession() {
        const rem = localStorage.getItem(KEYS.remember);
        if (rem) {
            const parsed = JSON.parse(rem);
            if (new Date(parsed.expires) > new Date()) {
                parsed.expires = new Date(Date.now() + 21 * 86400000).toISOString();
                localStorage.setItem(KEYS.remember, JSON.stringify(parsed));
                return parsed.userId;
            } else {
                localStorage.removeItem(KEYS.remember);
            }
        }
        return sessionStorage.getItem(KEYS.session);
    }

    function setSession(userId, remember) {
        if (remember) {
            const expires = new Date(Date.now() + 21 * 86400000).toISOString();
            localStorage.setItem(KEYS.remember, JSON.stringify({ userId, expires }));
        }
        sessionStorage.setItem(KEYS.session, userId);
    }

    function clearSession() {
        sessionStorage.removeItem(KEYS.session);
        localStorage.removeItem(KEYS.remember);
    }

    function getCurrentUser() {
        const uid = getSession();
        if (!uid) return null;
        return getUsers().find((u) => u.id === uid) || null;
    }

    function getLabs() { return LABS; }

    function getLab(id) { return LABS.find((l) => l.id === id); }

    function generateId(prefix) {
        return prefix + Date.now() + Math.random().toString(36).slice(2, 6);
    }

    return {
        getUsers, saveUsers, getReservations, saveReservations,
        getSession, setSession, clearSession, getCurrentUser,
        getLabs, getLab, generateId,
    };
})();

/* 2. UTILITIES */
const Utils = {
    formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },

    formatDateLong(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    },

    today() {
        return new Date().toISOString().split('T')[0];
    },

    next7Days() {
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            days.push(d.toISOString().split('T')[0]);
        }
        return days;
    },

    shortDay(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        const day = d.toLocaleDateString('en-US', { weekday: 'short' });
        const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return { day, date };
    },

    allSlots() {
        const slots = [];
        for (let h = 7; h < 21; h++) {
            slots.push(`${String(h).padStart(2, '0')}:00`);
            slots.push(`${String(h).padStart(2, '0')}:30`);
        }
        return slots;
    },

    slotLabel(slot) {
        const [h, m] = slot.split(':').map(Number);
        const period = h < 12 ? 'AM' : 'PM';
        const hour = h % 12 || 12;
        return `${hour}:${String(m).padStart(2, '0')} ${period}`;
    },

    slotsLabel(slots) {
        if (!slots || slots.length === 0) return '';
        const first = Utils.slotLabel(slots[0]);
        const lastSlot = slots[slots.length - 1];
        const [lh, lm] = lastSlot.split(':').map(Number);
        const endMin = lm + 30;
        const endH = endMin >= 60 ? lh + 1 : lh;
        const endM = endMin >= 60 ? endMin - 60 : endMin;
        const endStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
        return `${first} – ${Utils.slotLabel(endStr)}`;
    },

    isValidDLSUEmail(email) {
        return /^[^\s@]+@dlsu\.edu(\.ph)?$/.test(email);
    },

    avatarColors: ['#006B3F', '#1d4ed8', '#7c3aed', '#db2777', '#d97706', '#0891b2', '#dc2626', '#059669'],

    initials(name) {
        return name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
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
        toast.innerHTML = `<span>${type === 'success' ? '✔' : type === 'error' ? '✖' : 'ℹ'}</span> ${message}`;
        toast.style.cssText = `
      position:fixed; bottom:24px; right:24px; z-index:9999;
      background:${type === 'success' ? '#006B3F' : type === 'error' ? '#dc2626' : '#2563eb'};
      color:white; padding:12px 20px; border-radius:12px;
      font-size:14px; font-family:Inter,sans-serif;
      box-shadow:0 8px 24px rgba(0,0,0,0.2);
      display:flex; align-items:center; gap:8px;
      animation: slideInToast 0.3s ease;
    `;
        document.head.insertAdjacentHTML('beforeend',
            `<style>@keyframes slideInToast{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}</style>`);
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    },

    confirm(message, onConfirm, onCancel) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;`;
        overlay.innerHTML = `
      <div style="background:white;border-radius:16px;padding:28px;max-width:380px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);font-family:Inter,sans-serif;">
        <h3 style="margin:0 0 12px;font-size:18px;">Confirm Action</h3>
        <p style="color:#555;font-size:14px;margin:0 0 20px;line-height:1.5;">${message}</p>
        <div style="display:flex;gap:10px;">
          <button id="conf-cancel" style="flex:1;padding:10px;border:1px solid #ddd;border-radius:10px;background:white;cursor:pointer;font-family:inherit;">Cancel</button>
          <button id="conf-ok" style="flex:1;padding:10px;border:none;border-radius:10px;background:#006B3F;color:white;cursor:pointer;font-weight:600;font-family:inherit;">Confirm</button>
        </div>
      </div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('#conf-ok').onclick = () => { overlay.remove(); onConfirm && onConfirm(); };
        overlay.querySelector('#conf-cancel').onclick = () => { overlay.remove(); onCancel && onCancel(); };
    },
};

/* 3. AUTH */
const Auth = {
    requireLogin(role) {
        const user = Store.getCurrentUser();
        if (!user) {
            window.location.href = 'login.html';
            return null;
        }
        if (role && user.role !== role) {
            Utils.toast('Access denied for your role.', 'error');
            window.location.href = user.role === 'technician' ? 'tech-dashboard.html' : 'student-dashboard.html';
            return null;
        }
        return user;
    },

    logout() {
        Store.clearSession();
        window.location.href = 'ANIMOLABS.html';
    },

    addNavbar(user) {
        const existing = document.querySelector('.app-navbar');
        if (existing) return;

        const nav = document.createElement('nav');
        nav.className = 'app-navbar';
        const isTech = user.role === 'technician';

        nav.innerHTML = `
      <div class="nav-inner">
        <a href="${isTech ? 'tech-dashboard.html' : 'student-dashboard.html'}" class="nav-brand">
          AnimoLabs
        </a>
        <div class="nav-links">
          ${isTech ? `
            <a href="tech-dashboard.html">Dashboard</a>
            <a href="reserve-student.html">Reserve for Student</a>
            <a href="manage-reservations.html">Manage</a>
            <a href="all-reservations.html">All Reservations</a>
            <a href="view-slots.html">View Labs</a>
          ` : `
            <a href="student-dashboard.html">Dashboard</a>
            <a href="view-slots.html">Book a Seat</a>
            <a href="my-reservations.html">My Reservations</a>
            <a href="search.html">Search Slots</a>
          `}
        </div>
        <div class="nav-user">
          <div class="nav-avatar" style="background:${user.avatarColor || '#006B3F'}"
               onclick="window.location.href='profile.html'" title="My Profile">
            ${user.avatar || Utils.initials(user.name)}
          </div>
          <button class="nav-logout" onclick="Auth.logout()">Logout</button>
        </div>
      </div>`;

        // inject styles once
        if (!document.getElementById('navbar-styles')) {
            const style = document.createElement('style');
            style.id = 'navbar-styles';
            style.textContent = `
        body{padding:0!important;margin:0!important;}
        .app-navbar{background:#006B3F;color:white;box-shadow:0 2px 12px rgba(0,0,0,0.2);position:sticky;top:0;z-index:900;}
        .nav-inner{max-width:1200px;margin:auto;display:flex;align-items:center;padding:0 20px;gap:20px;height:56px;}
        .nav-brand{color:white;text-decoration:none;font-weight:700;font-size:18px;display:flex;align-items:center;gap:8px;white-space:nowrap;}
        .nav-logo{font-size:20px;}
        .nav-links{display:flex;gap:4px;flex:1;overflow:hidden;}
        .nav-links a{color:rgba(255,255,255,0.85);text-decoration:none;padding:6px 10px;border-radius:8px;font-size:13px;white-space:nowrap;transition:all 0.2s;}
        .nav-links a:hover,.nav-links a.active{background:rgba(255,255,255,0.15);color:white;}
        .nav-user{display:flex;align-items:center;gap:10px;margin-left:auto;}
        .nav-avatar{width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:white;cursor:pointer;border:2px solid rgba(255,255,255,0.3);transition:all 0.2s;}
        .nav-avatar:hover{border-color:white;transform:scale(1.05);}
        .nav-logout{background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);color:white;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:13px;font-family:inherit;transition:all 0.2s;}
        .nav-logout:hover{background:rgba(255,255,255,0.25);}
      `;
            document.head.appendChild(style);
        }

        document.body.prepend(nav);

        // highlight current page
        const currentPage = window.location.pathname.split('/').pop();
        nav.querySelectorAll('.nav-links a').forEach(a => {
            if (a.getAttribute('href') === currentPage) a.classList.add('active');
        });
    },
};

/* 4. PAGE CONTROLLERS */

/* LANDING */
const LandingPage = {
    init() {
        const user = Store.getCurrentUser();
        if (user) {
            const loginBtn = document.getElementById('loginBtn');
            const regBtn = document.getElementById('regBtn');
            if (loginBtn) loginBtn.textContent = 'Dashboard';
            if (loginBtn) loginBtn.closest('a') && (loginBtn.closest('a').href = user.role === 'technician' ? 'tech-dashboard.html' : 'student-dashboard.html');
            if (regBtn) { regBtn.textContent = 'Logout'; regBtn.onclick = (e) => { e.preventDefault(); Auth.logout(); }; }
        }
        this.updateLabCards();
    },

    updateLabCards() {
        const today = Utils.today();
        const reservations = Store.getReservations().filter(r =>
            r.date === today && r.status !== 'cancelled'
        );

        // count unique reserved seats per lab today
        const reservedPerLab = {};
        reservations.forEach(r => {
            if (!reservedPerLab[r.lab]) reservedPerLab[r.lab] = new Set();
            reservedPerLab[r.lab].add(r.seat);
        });

        const labCards = document.querySelectorAll('.lab-card');
        const labs = Store.getLabs();

        labCards.forEach((card, i) => {
            const lab = labs[i];
            if (!lab) return;

            const reservedCount = reservedPerLab[lab.id] ? reservedPerLab[lab.id].size : 0;
            const available = lab.seats - reservedCount;
            const pct = Math.round((reservedCount / lab.seats) * 100);

            // update "X available" badge
            const badge = card.querySelector('.available');
            if (badge) badge.textContent = `${available} available`;

            // update "X / Y seats available" text
            const availText = card.querySelector('.availability-text span');
            if (availText) availText.textContent = `${available} / ${lab.seats} seats available`;

            // update progress bar width and color class
            const progress = card.querySelector('.progress');
            if (progress) {
                progress.style.width = `${pct}%`;
                progress.className = 'progress';
                if (pct >= 80) progress.classList.add('danger');
                else if (pct >= 50) progress.classList.add('warning');
            }

            // update footer
            const footer = card.querySelector('.lab-footer span');
            if (footer) footer.textContent = `${lab.seats} total seats`;
        });
    },
};

/* REGISTER */
const RegisterPage = {
    init() {
        const form = document.querySelector('form');
        if (!form) return;

        const pwInput = form.querySelector('input[type="password"]');
        const bars = form.querySelectorAll('.strength-bar div');
        const strengthText = form.querySelector('.strength-text');
        const roleButtons = form.querySelectorAll('.role-btn');
        const roleDesc = form.querySelector('.role-desc');
        let selectedRole = 'student';

        // role toggle
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

        // password strength
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

        // submit
        const submitBtn = form.querySelector('.submit-btn');
        if (submitBtn) {
            submitBtn.onclick = (e) => {
                e.preventDefault();
                const inputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="password"]');
                const name = inputs[0]?.value.trim();
                const email = inputs[1]?.value.trim();
                const pw = inputs[2]?.value;
                const confirm = inputs[3]?.value;

                if (!name) return Utils.toast('Please enter your full name.', 'error');
                if (!Utils.isValidDLSUEmail(email)) return Utils.toast('Must use a DLSU email address (@dlsu.edu or @dlsu.edu.ph).', 'error');
                if (pw.length < 8) return Utils.toast('Password must be at least 8 characters.', 'error');
                if (pw !== confirm) return Utils.toast('Passwords do not match.', 'error');

                const users = Store.getUsers();
                if (users.find(u => u.email === email)) return Utils.toast('This email is already registered.', 'error');

                const colorIdx = Math.floor(Math.random() * Utils.avatarColors.length);
                const newUser = {
                    id: Store.generateId('u'),
                    name, email, password: pw,
                    role: selectedRole,
                    bio: '',
                    avatar: Utils.initials(name),
                    avatarColor: Utils.avatarColors[colorIdx],
                    createdAt: Utils.today(),
                };
                users.push(newUser);
                Store.saveUsers(users);
                Store.setSession(newUser.id, false);
                Utils.toast('Account created! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = selectedRole === 'technician' ? 'tech-dashboard.html' : 'student-dashboard.html';
                }, 1000);
            };
        }

        // demo fill
        document.querySelectorAll('.demo-buttons button').forEach(btn => {
            btn.addEventListener('click', () => {
                const emailInput = form.querySelector('input[type="email"]');
                if (emailInput) emailInput.value = btn.textContent.trim().replace('Student: ', '').replace('Technician: ', '');
            });
        });
    },
};

/* LOGIN */
const LoginPage = {
    init() {
        const form = document.querySelector('form');
        if (!form) return;

        // demo buttons
        document.querySelectorAll('.demo-buttons button').forEach(btn => {
            btn.addEventListener('click', () => {
                const emailInput = form.querySelector('input[type="email"]');
                const pwInput = form.querySelector('input[type="password"]');
                if (emailInput) emailInput.value = btn.textContent.trim().replace(/^(Student|Technician): /, '');
                if (pwInput) pwInput.value = 'password123';
            });
        });

        const loginBtn = form.querySelector('.login-btn');
        if (loginBtn) {
            loginBtn.onclick = (e) => {
                e.preventDefault();
                const email = form.querySelector('input[type="email"]')?.value.trim();
                const password = form.querySelector('input[type="password"]')?.value;
                const remember = form.querySelector('input[type="checkbox"]')?.checked;

                if (!email || !password) return Utils.toast('Please enter email and password.', 'error');

                const users = Store.getUsers();
                const user = users.find(u => u.email === email && u.password === password);
                if (!user) return Utils.toast('Invalid email or password.', 'error');

                Store.setSession(user.id, remember);
                Utils.toast(`Welcome back, ${user.name.split(' ')[0]}!`, 'success');
                setTimeout(() => {
                    window.location.href = user.role === 'technician' ? 'tech-dashboard.html' : 'student-dashboard.html';
                }, 800);
            };
        }
    },
};

/* STUDENT DASHBOARD */
const StudentDashboard = {
    init() {
        const user = Auth.requireLogin('student');
        if (!user) return;
        Auth.addNavbar(user);

        // update greeting
        const header = document.querySelector('.header h1');
        if (header) header.textContent = `Welcome back, ${user.name.split(' ')[0]}!`;

        const dateP = document.querySelector('.header p');
        if (dateP) dateP.textContent = Utils.formatDateLong(Utils.today());

        const reservations = Store.getReservations().filter(r => r.userId === user.id && r.status !== 'cancelled');
        const upcoming = reservations.filter(r => r.date >= Utils.today());
        const todayRes = upcoming.filter(r => r.date === Utils.today());

        // stats
        const statCards = document.querySelectorAll('.stat-card h2');
        if (statCards[0]) statCards[0].textContent = upcoming.length;
        if (statCards[1]) statCards[1].textContent = todayRes.length;
        if (statCards[2]) statCards[2].textContent = Store.getLabs().length;

        // reservations list
        const resList = document.querySelector('.grid-2 .card:first-child');
        if (resList) {
            const existingRes = resList.querySelectorAll('.reservation');
            existingRes.forEach(r => r.remove());

            if (upcoming.length === 0) {
                resList.insertAdjacentHTML('beforeend', `<p style="color:#999;font-size:14px;margin-top:15px;">No upcoming reservations. <a href="view-slots.html" style="color:#006B3F;">Book a seat →</a></p>`);
            } else {
                upcoming.slice(0, 3).forEach(r => {
                    const lab = Store.getLab(r.lab);
                    resList.insertAdjacentHTML('beforeend', `
            <div class="reservation">
              <div class="seat">${r.seat}</div>
              <div>
                <h4>${lab?.name} – Seat ${r.seat}</h4>
                <p style="font-size:13px;color:#666;">${Utils.formatDate(r.date)} • ${Utils.slotsLabel(r.slots)}</p>
              </div>
              <span class="status ${r.status}">${r.status}</span>
            </div>`);
                });
            }
        }
    },
};

/* TECH DASHBOARD */
const TechDashboard = {
    init() {
        const user = Auth.requireLogin('technician');
        if (!user) return;
        Auth.addNavbar(user);

        const header = document.querySelector('.header h1');
        if (header) header.textContent = 'Lab Technician Dashboard';

        const dateP = document.querySelector('.header p');
        if (dateP) dateP.textContent = Utils.formatDateLong(Utils.today());

        const reservations = Store.getReservations();
        const todayRes = reservations.filter(r => r.date === Utils.today() && r.status !== 'cancelled');
        const pending = reservations.filter(r => r.status === 'pending');
        const confirmed = reservations.filter(r => r.status === 'confirmed' && r.date === Utils.today());

        const users = Store.getUsers().filter(u => u.role === 'student');
        const usersWithRes = new Set(todayRes.map(r => r.userId)).size;

        const statCards = document.querySelectorAll('.stat-card h2');
        if (statCards[0]) statCards[0].textContent = confirmed.length;
        if (statCards[1]) statCards[1].textContent = pending.length;
        if (statCards[2]) statCards[2].textContent = reservations.filter(r => r.status !== 'cancelled').length;
        if (statCards[3]) statCards[3].textContent = usersWithRes;

        // today's reservations list
        const todayCard = document.querySelector('.main-grid .card:first-child');
        if (todayCard) {
            const existingRes = todayCard.querySelectorAll('.reservation');
            existingRes.forEach(el => el.remove());

            if (todayRes.length === 0) {
                todayCard.insertAdjacentHTML('beforeend', `<p style="color:#999;font-size:14px;margin-top:10px;">No reservations for today.</p>`);
            } else {
                const allUsers = Store.getUsers();
                todayRes.slice(0, 5).forEach(r => {
                    const u = allUsers.find(x => x.id === r.userId);
                    const lab = Store.getLab(r.lab);
                    todayCard.insertAdjacentHTML('beforeend', `
            <div class="reservation" style="margin-bottom:15px;">
              <div class="seat">${r.seat}</div>
              <div>
                <h4>${r.anonymous ? 'Anonymous' : (u?.name || 'Unknown')}</h4>
                <p style="font-size:13px;color:#666;">${lab?.name} • Seat ${r.seat} • ${Utils.slotsLabel(r.slots)}</p>
              </div>
              <span class="status ${r.status}">${r.status}</span>
            </div>`);
                });
            }
        }

        // alert
        const alert = document.querySelector('.alert');
        if (alert && pending.length > 0) {
            alert.innerHTML = `⚠ ${pending.length} pending reservation${pending.length > 1 ? 's' : ''} need attention. <a href="manage-reservations.html">Review →</a>`;
        } else if (alert) {
            alert.style.display = 'none';
        }
    },
};

/* VIEW SLOTS */
const ViewSlotsPage = {
    selectedSeat: null,
    selectedSlots: [],
    currentLab: 'gokongwei',
    currentDate: Utils.today(),
    autoRefreshTimer: null,

    init() {
        const user = Auth.requireLogin();
        if (!user) return;
        Auth.addNavbar(user);
        this.render(user);
        // auto-refresh every 60 seconds
        this.autoRefreshTimer = setInterval(() => this.renderSeatMap(user), 60000);
    },

    render(user) {
        this.renderFilters();
        this.renderLabInfo();
        this.renderSeatMap(user);
        this.renderPanel(user);

        const refreshBtn = document.querySelector('.refresh');
        if (refreshBtn) {
            refreshBtn.onclick = () => {
                this.renderSeatMap(user);
                this.renderLabInfo();
                Utils.toast('Seat map refreshed.', 'success');
            };
        }
    },

    renderFilters() {
        const labSelect = document.querySelector('.filter select');
        if (labSelect) {
            labSelect.innerHTML = Store.getLabs().map(l =>
                `<option value="${l.id}" ${l.id === this.currentLab ? 'selected' : ''}>${l.name} – ${l.location}</option>`
            ).join('');
            labSelect.onchange = () => {
                this.currentLab = labSelect.value;
                this.selectedSeat = null;
                this.selectedSlots = [];
                const user = Store.getCurrentUser();
                this.renderLabInfo();
                this.renderSeatMap(user);
                this.renderPanel(user);
            };
        }

        // date buttons
        const datesDiv = document.querySelector('.dates');
        if (datesDiv) {
            datesDiv.innerHTML = Utils.next7Days().map(d => {
                const { day, date } = Utils.shortDay(d);
                return `<button class="date ${d === this.currentDate ? 'active' : ''}" data-date="${d}">${day}<br>${date}</button>`;
            }).join('');

            datesDiv.querySelectorAll('.date').forEach(btn => {
                btn.onclick = () => {
                    this.currentDate = btn.dataset.date;
                    this.selectedSeat = null;
                    this.selectedSlots = [];
                    datesDiv.querySelectorAll('.date').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    const user = Store.getCurrentUser();
                    this.renderSeatMap(user);
                    this.renderPanel(user);
                };
            });
        }
    },

    renderLabInfo() {
        const lab = Store.getLab(this.currentLab);
        const labInfo = document.querySelector('.lab-info');
        if (labInfo && lab) {
            labInfo.querySelector('h3') && (labInfo.querySelector('h3').textContent = lab.name);
            const p = labInfo.querySelector('p');
            if (p) p.textContent = `${lab.location} • ${lab.seats} seats`;
            const updated = labInfo.querySelector('.updated');
            if (updated) updated.textContent = `Updated ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
        }
    },

    getReservationsForLabDate() {
        return Store.getReservations().filter(r =>
            r.lab === this.currentLab &&
            r.date === this.currentDate &&
            r.status !== 'cancelled'
        );
    },

    renderSeatMap(user) {
        const lab = Store.getLab(this.currentLab);
        if (!lab) return;
        const seatMap = document.querySelector('.seat-map');
        if (!seatMap) return;

        const reservations = this.getReservationsForLabDate();
        const reservedSeats = {};
        reservations.forEach(r => { reservedSeats[r.seat] = r; });

        const seatsDiv = seatMap.querySelector('.seats');
        if (!seatsDiv) return;
        seatsDiv.innerHTML = '';

        for (let s = 1; s <= lab.seats; s++) {
            const res = reservedSeats[s];
            const isMyRes = res && res.userId === user.id;
            const isReserved = res && !isMyRes;
            const isSelected = s === this.selectedSeat;

            let cls = 'available';
            if (isSelected) cls = 'selected-seat';
            else if (isMyRes) cls = 'mine';
            else if (isReserved) cls = 'reserved';

            const btn = document.createElement('button');
            btn.className = `seat ${cls}`;
            btn.textContent = s;
            btn.title = isReserved
                ? (res.anonymous ? 'Reserved (Anonymous)' : `Reserved by ${Store.getUsers().find(u => u.id === res.userId)?.name || 'Unknown'}`)
                : isMyRes ? 'Your reservation' : `Seat ${s} – Available`;

            if (!isReserved) {
                btn.onclick = () => {
                    this.selectedSeat = s;
                    this.selectedSlots = [];
                    this.renderSeatMap(user);
                    this.renderPanel(user);
                };
            }
            seatsDiv.appendChild(btn);
        }

        // seat map summary
        const totalSeats = lab.seats;
        const reservedCount = Object.keys(reservedSeats).length;
        const summaryItems = document.querySelectorAll('.summary-item span:last-child');
        if (summaryItems[0]) summaryItems[0].textContent = totalSeats - reservedCount;
        if (summaryItems[1]) summaryItems[1].textContent = reservedCount;
        if (summaryItems[2]) summaryItems[2].textContent = 0;
    },

    renderPanel(user) {
        const panel = document.querySelector('.seat-panel');
        if (!panel) return;

        if (!this.selectedSeat) {
            panel.innerHTML = `
        <h3>Select a seat</h3>
        <p style="color:#666;font-size:14px;margin-top:8px;">Click any available seat to reserve it.</p>
        <div class="summary" style="margin-top:20px;">
          <h4>Lab Summary</h4>
          ${this.buildSummaryItems()}
        </div>`;
            return;
        }

        const reservations = this.getReservationsForLabDate();
        const res = reservations.find(r => r.seat === this.selectedSeat);
        const allUsers = Store.getUsers();

        if (res && res.userId !== user.id) {
            // someone else's reservation
            const owner = allUsers.find(u => u.id === res.userId);
            panel.innerHTML = `
        <h3>Seat ${this.selectedSeat}</h3>
        <div style="background:#fee2e2;border-radius:12px;padding:14px;margin:12px 0;font-size:14px;">
          <b style="color:#dc2626;">Reserved</b>
          <p style="color:#666;margin-top:4px;">
            By: ${res.anonymous ? 'Anonymous' : `<a href="profile.html?id=${owner?.id}" style="color:#006B3F;">${owner?.name || 'Unknown'}</a>`}
          </p>
          <p style="color:#666;margin-top:4px;">Time: ${Utils.slotsLabel(res.slots)}</p>
        </div>
        <button onclick="ViewSlotsPage.selectedSeat=null;ViewSlotsPage.renderSeatMap(Store.getCurrentUser());ViewSlotsPage.renderPanel(Store.getCurrentUser());"
          style="border:1px solid #ddd;background:white;padding:8px 14px;border-radius:8px;cursor:pointer;font-family:inherit;">← Back</button>`;
            return;
        }

        if (res && res.userId === user.id) {
            panel.innerHTML = `
        <h3>Seat ${this.selectedSeat} – Your Reservation</h3>
        <div style="background:#dbeafe;border-radius:12px;padding:14px;margin:12px 0;font-size:14px;">
          <b style="color:#1d4ed8;">Your booking</b>
          <p style="color:#555;margin-top:4px;">Time: ${Utils.slotsLabel(res.slots)}</p>
          <p style="color:#555;">Status: <b>${res.status}</b></p>
        </div>
        <button onclick="window.location.href='my-reservations.html'"
          style="background:#006B3F;color:white;border:none;padding:10px 16px;border-radius:10px;cursor:pointer;font-family:inherit;margin-top:8px;width:100%;">
          Manage Reservations →
        </button>
        <button onclick="ViewSlotsPage.selectedSeat=null;ViewSlotsPage.renderSeatMap(Store.getCurrentUser());ViewSlotsPage.renderPanel(Store.getCurrentUser());"
          style="border:1px solid #ddd;background:white;padding:8px 14px;border-radius:8px;cursor:pointer;font-family:inherit;margin-top:8px;width:100%;">← Back</button>`;
            return;
        }

        // available seat – show time slot picker
        const allSlots = Utils.allSlots();
        const takenSlots = new Set();
        reservations.forEach(r => r.slots.forEach(s => takenSlots.add(`${r.seat}-${s}`)));

        panel.innerHTML = `
      <h3>Seat ${this.selectedSeat} – Book</h3>
      <p style="font-size:13px;color:#666;margin:8px 0;">Select one or more 30-min slots:</p>
      <div id="slot-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;max-height:260px;overflow-y:auto;margin-bottom:12px;"></div>
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:12px;">
        <input type="checkbox" id="anon-check"> Reserve anonymously
      </label>
      <button id="confirm-reserve-btn" style="background:#006B3F;color:white;border:none;padding:10px 16px;border-radius:10px;cursor:pointer;font-family:inherit;width:100%;font-weight:600;opacity:0.5;" disabled>
        Confirm Reservation
      </button>
      <button onclick="ViewSlotsPage.selectedSeat=null;ViewSlotsPage.renderSeatMap(Store.getCurrentUser());ViewSlotsPage.renderPanel(Store.getCurrentUser());"
        style="border:1px solid #ddd;background:white;padding:8px 14px;border-radius:8px;cursor:pointer;font-family:inherit;margin-top:8px;width:100%;">← Back</button>`;

        const slotGrid = panel.querySelector('#slot-grid');
        allSlots.forEach(slot => {
            const isTaken = takenSlots.has(`${this.selectedSeat}-${slot}`);
            const isSelected = this.selectedSlots.includes(slot);
            const btn = document.createElement('button');
            btn.style.cssText = `padding:6px 4px;border-radius:8px;font-size:12px;cursor:${isTaken ? 'not-allowed' : 'pointer'};
        border:1px solid ${isTaken ? '#fecaca' : isSelected ? '#006B3F' : '#ddd'};
        background:${isTaken ? '#fee2e2' : isSelected ? '#e8f5ee' : 'white'};
        color:${isTaken ? '#dc2626' : isSelected ? '#006B3F' : '#333'};font-family:inherit;`;
            btn.textContent = Utils.slotLabel(slot);
            btn.disabled = isTaken;
            if (!isTaken) {
                btn.onclick = () => {
                    const idx = this.selectedSlots.indexOf(slot);
                    if (idx === -1) this.selectedSlots.push(slot);
                    else this.selectedSlots.splice(idx, 1);
                    this.selectedSlots.sort();
                    this.renderPanel(user);
                };
            }
            slotGrid.appendChild(btn);
        });

        const confirmBtn = panel.querySelector('#confirm-reserve-btn');
        if (this.selectedSlots.length > 0) {
            confirmBtn.disabled = false;
            confirmBtn.style.opacity = '1';
            confirmBtn.textContent = `Reserve ${this.selectedSlots.length} slot${this.selectedSlots.length > 1 ? 's' : ''} – Seat ${this.selectedSeat}`;
        }

        confirmBtn.onclick = () => {
            const anonymous = panel.querySelector('#anon-check')?.checked || false;
            if (this.selectedSlots.length === 0) return Utils.toast('Please select at least one time slot.', 'error');

            const reservations = Store.getReservations();
            const newRes = {
                id: Store.generateId('r'),
                userId: user.id,
                lab: this.currentLab,
                seat: this.selectedSeat,
                date: this.currentDate,
                slots: [...this.selectedSlots],
                status: 'confirmed',
                anonymous,
                bookedAt: Utils.today(),
                note: '',
            };
            reservations.push(newRes);
            Store.saveReservations(reservations);
            Utils.toast(`Seat ${this.selectedSeat} reserved for ${Utils.slotsLabel(this.selectedSlots)}!`, 'success');
            this.selectedSeat = null;
            this.selectedSlots = [];
            this.renderSeatMap(user);
            this.renderPanel(user);
        };
    },

    buildSummaryItems() {
        const lab = Store.getLab(this.currentLab);
        if (!lab) return '';
        const reservations = this.getReservationsForLabDate();
        const reserved = reservations.length;
        return `
      <div class="summary-item"><span>Available</span><span>${lab.seats - reserved}</span></div>
      <div class="summary-item"><span>Reserved</span><span>${reserved}</span></div>
      <div class="summary-item"><span>Total</span><span>${lab.seats}</span></div>`;
    },
};

// add selected seat style
(function () {
    const s = document.createElement('style');
    s.textContent = `.seat.selected-seat{background:#006B3F!important;color:white!important;border-color:#006B3F!important;}`;
    document.head.appendChild(s);
})();

/* MY RESERVATIONS */
const MyReservationsPage = {
    filter: 'all',

    init() {
        const user = Auth.requireLogin('student');
        if (!user) return;
        Auth.addNavbar(user);
        this.renderSummary(user);
        this.renderList(user);
        this.bindFilters(user);

        const newBtn = document.querySelector('.new-btn');
        if (newBtn) newBtn.onclick = () => window.location.href = 'view-slots.html';
    },

    renderSummary(user) {
        const all = Store.getReservations().filter(r => r.userId === user.id);
        const confirmed = all.filter(r => r.status === 'confirmed').length;
        const pending = all.filter(r => r.status === 'pending').length;
        const cancelled = all.filter(r => r.status === 'cancelled').length;

        const cards = document.querySelectorAll('.summary-card h2');
        if (cards[0]) cards[0].textContent = all.length;
        if (cards[1]) cards[1].textContent = confirmed;
        if (cards[2]) cards[2].textContent = pending;

        // add cancelled card if not present
        const summaryDiv = document.querySelector('.summary');
        if (summaryDiv && !summaryDiv.querySelector('[data-cancelled]')) {
            summaryDiv.insertAdjacentHTML('beforeend',
                `<div class="summary-card" data-cancelled="1"><h2>${cancelled}</h2><p>Cancelled</p></div>`);
        }
    },

    bindFilters(user) {
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.onclick = () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filter = btn.textContent.trim().toLowerCase();
                this.renderList(user);
            };
        });
    },

    renderList(user) {
        const allRes = Store.getReservations().filter(r => r.userId === user.id);
        const filtered = this.filter === 'all' ? allRes : allRes.filter(r => r.status === this.filter);
        const container = document.querySelector('.reservations');
        if (!container) return;
        container.innerHTML = '';

        if (filtered.length === 0) {
            container.innerHTML = `
        <div class="empty">
          <h3>No reservations found</h3>
          <p>You don't have any ${this.filter !== 'all' ? this.filter : ''} reservations yet.</p>
          <button onclick="window.location.href='view-slots.html'" style="background:#006B3F;color:white;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;margin-top:12px;">
            Make a reservation →
          </button>
        </div>`;
            return;
        }

        filtered.sort((a, b) => b.date.localeCompare(a.date)).forEach(r => {
            const lab = Store.getLab(r.lab);
            const card = document.createElement('div');
            card.className = 'reservation-card';
            card.innerHTML = `
        <div class="seat">${r.seat}</div>
        <div class="info">
          <div class="top">
            <h3>${lab?.name} – Seat ${r.seat}</h3>
            <span class="status ${r.status}">${r.status}</span>
          </div>
          <div class="details">
            <span>💻 ${lab?.name}</span>
            <span>📅 ${Utils.formatDate(r.date)}</span>
            <span>⏰ ${Utils.slotsLabel(r.slots)}</span>
            ${r.anonymous ? '<span>👤 Anonymous</span>' : ''}
          </div>
          <p class="booked">Booked on ${Utils.formatDate(r.bookedAt)}</p>
        </div>
        <div class="actions">
          ${r.status !== 'cancelled' ? `<button class="edit" data-id="${r.id}">Edit</button>` : ''}
          ${r.status !== 'cancelled' ? `<button class="cancel" data-id="${r.id}">Cancel</button>` : ''}
        </div>`;
            container.appendChild(card);

            card.querySelector('.edit')?.addEventListener('click', () => this.openEditModal(r, user));
            card.querySelector('.cancel')?.addEventListener('click', () => {
                Utils.confirm(`Cancel reservation for ${lab?.name} – Seat ${r.seat} on ${Utils.formatDate(r.date)}?`, () => {
                    const all = Store.getReservations();
                    const idx = all.findIndex(x => x.id === r.id);
                    if (idx > -1) { all[idx].status = 'cancelled'; Store.saveReservations(all); }
                    Utils.toast('Reservation cancelled.', 'success');
                    this.renderSummary(user);
                    this.renderList(user);
                });
            });
        });
    },

    openEditModal(res, user) {
        const lab = Store.getLab(res.lab);
        const allSlots = Utils.allSlots();
        const reservations = Store.getReservations().filter(r =>
            r.lab === res.lab && r.date === res.date && r.id !== res.id && r.status !== 'cancelled'
        );
        const takenSlots = new Set();
        reservations.forEach(r => r.slots.forEach(s => takenSlots.has(s) || takenSlots.add(`${r.seat}-${s}`)));

        let selectedSlots = [...res.slots];

        const overlay = document.createElement('div');
        overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;`;
        overlay.innerHTML = `
      <div style="background:white;border-radius:16px;padding:24px;max-width:480px;width:95%;box-shadow:0 20px 60px rgba(0,0,0,0.3);font-family:Inter,sans-serif;max-height:90vh;overflow-y:auto;">
        <h3 style="margin:0 0 4px;">Edit Reservation</h3>
        <p style="color:#666;font-size:14px;margin:0 0 16px;">${lab?.name} – Seat ${res.seat} – ${Utils.formatDate(res.date)}</p>
        <p style="font-size:13px;font-weight:600;margin-bottom:8px;">Select time slots:</p>
        <div id="edit-slots" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:16px;max-height:220px;overflow-y:auto;"></div>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:16px;">
          <input type="checkbox" id="edit-anon" ${res.anonymous ? 'checked' : ''}> Reserve anonymously
        </label>
        <div style="display:flex;gap:10px;">
          <button id="edit-cancel-btn" style="flex:1;padding:10px;border:1px solid #ddd;border-radius:10px;cursor:pointer;font-family:inherit;">Cancel</button>
          <button id="edit-save-btn" style="flex:1;padding:10px;background:#006B3F;color:white;border:none;border-radius:10px;cursor:pointer;font-weight:600;font-family:inherit;">Save Changes</button>
        </div>
      </div>`;
        document.body.appendChild(overlay);

        const renderSlots = () => {
            const grid = overlay.querySelector('#edit-slots');
            grid.innerHTML = '';
            allSlots.forEach(slot => {
                const isTaken = takenSlots.has(`${res.seat}-${slot}`);
                const isSelected = selectedSlots.includes(slot);
                const btn = document.createElement('button');
                btn.style.cssText = `padding:6px 4px;border-radius:8px;font-size:11px;cursor:${isTaken ? 'not-allowed' : 'pointer'};
          border:1px solid ${isTaken ? '#fecaca' : isSelected ? '#006B3F' : '#ddd'};
          background:${isTaken ? '#fee2e2' : isSelected ? '#e8f5ee' : 'white'};
          color:${isTaken ? '#dc2626' : isSelected ? '#006B3F' : '#333'};font-family:inherit;`;
                btn.textContent = Utils.slotLabel(slot);
                btn.disabled = isTaken;
                if (!isTaken) btn.onclick = () => {
                    const idx = selectedSlots.indexOf(slot);
                    if (idx === -1) selectedSlots.push(slot);
                    else selectedSlots.splice(idx, 1);
                    selectedSlots.sort();
                    renderSlots();
                };
                grid.appendChild(btn);
            });
        };
        renderSlots();

        overlay.querySelector('#edit-cancel-btn').onclick = () => overlay.remove();
        overlay.querySelector('#edit-save-btn').onclick = () => {
            if (selectedSlots.length === 0) return Utils.toast('Select at least one time slot.', 'error');
            const all = Store.getReservations();
            const idx = all.findIndex(x => x.id === res.id);
            if (idx > -1) {
                all[idx].slots = selectedSlots;
                all[idx].anonymous = overlay.querySelector('#edit-anon').checked;
                Store.saveReservations(all);
            }
            overlay.remove();
            Utils.toast('Reservation updated!', 'success');
            this.renderList(user);
        };
    },
};

/* ALL RESERVATIONS (tech) */
const AllReservationsPage = {
    init() {
        const user = Auth.requireLogin('technician');
        if (!user) return;
        Auth.addNavbar(user);
        this.renderAll();
    },

    renderAll(filters = {}) {
        const allRes = Store.getReservations();
        const allUsers = Store.getUsers();

        // update summary
        const cards = document.querySelectorAll('.summary-card h2');
        if (cards[0]) cards[0].textContent = allRes.length;
        if (cards[1]) cards[1].textContent = allRes.filter(r => r.status === 'confirmed').length;
        if (cards[2]) cards[2].textContent = allRes.filter(r => r.status === 'pending').length;
        if (cards[3]) cards[3].textContent = allRes.filter(r => r.status === 'cancelled').length;

        let filtered = [...allRes];
        if (filters.search) {
            const q = filters.search.toLowerCase();
            filtered = filtered.filter(r => {
                const u = allUsers.find(x => x.id === r.userId);
                const lab = Store.getLab(r.lab);
                return (u?.name || '').toLowerCase().includes(q) ||
                    (u?.email || '').toLowerCase().includes(q) ||
                    (lab?.name || '').toLowerCase().includes(q) ||
                    String(r.seat).includes(q);
            });
        }
        if (filters.lab && filters.lab !== 'all') filtered = filtered.filter(r => r.lab === filters.lab);
        if (filters.date && filters.date !== 'all') filtered = filtered.filter(r => r.date === filters.date);
        if (filters.status && filters.status !== 'all') filtered = filtered.filter(r => r.status === filters.status);

        const resultsP = document.querySelector('.results');
        if (resultsP) resultsP.textContent = `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`;

        const tbody = document.querySelector('tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        filtered.sort((a, b) => b.date.localeCompare(a.date) || b.bookedAt.localeCompare(a.bookedAt))
            .forEach((r, i) => {
                const u = allUsers.find(x => x.id === r.userId);
                const lab = Store.getLab(r.lab);
                const tr = document.createElement('tr');
                if (i % 2 === 1) tr.className = 'alt';
                tr.innerHTML = `
          <td><div class="seat">${r.seat}</div></td>
          <td>${lab?.name || r.lab}</td>
          <td>
            <div class="student">
              <p class="name">${r.anonymous ? 'Anonymous' : (u?.name || 'Unknown')}</p>
              <p class="email">${r.anonymous ? '—' : (u?.email || '')}</p>
            </div>
          </td>
          <td>
            <p>${Utils.formatDate(r.date)}</p>
            <span class="time">${Utils.slotsLabel(r.slots)}</span>
          </td>
          <td><span class="status ${r.status}">${r.status}</span></td>
          <td class="booked">${Utils.formatDate(r.bookedAt)}</td>`;
                tbody.appendChild(tr);
            });
    },

    bindFilters() {
        const getFilters = () => ({
            search: document.querySelector('.filters input')?.value,
            lab: document.querySelector('.filters select:nth-child(2)')?.value?.toLowerCase().replace('all labs', 'all'),
            date: document.querySelector('.filters select:nth-child(3)')?.value,
            status: 'all',
        });

        document.querySelectorAll('.filters input, .filters select').forEach(el => {
            el.addEventListener('input', () => this.renderAll(getFilters()));
        });
    },
};

/* MANAGE RESERVATIONS (tech) */
const ManageReservationsPage = {
    init() {
        const user = Auth.requireLogin('technician');
        if (!user) return;
        Auth.addNavbar(user);
        this.renderAll();
        this.bindFilters();
    },

    renderAll(filters = {}) {
        const allRes = Store.getReservations();
        const allUsers = Store.getUsers();
        const now = new Date();

        // stats
        const cards = document.querySelectorAll('.stat-card h2');
        if (cards[0]) cards[0].textContent = allRes.filter(r => r.status !== 'cancelled').length;
        if (cards[1]) cards[1].textContent = allRes.filter(r => r.date === Utils.today() && r.status !== 'cancelled').length;
        if (cards[2]) cards[2].textContent = allRes.filter(r => r.status === 'pending').length;
        if (cards[3]) cards[3].textContent = allRes.filter(r => r.status === 'cancelled').length;

        let filtered = [...allRes];
        if (filters.search) {
            const q = filters.search.toLowerCase();
            filtered = filtered.filter(r => {
                const u = allUsers.find(x => x.id === r.userId);
                const lab = Store.getLab(r.lab);
                return (u?.name || '').toLowerCase().includes(q) ||
                    (u?.email || '').toLowerCase().includes(q) ||
                    (lab?.name || '').toLowerCase().includes(q);
            });
        }
        if (filters.lab && filters.lab !== 'all labs') {
            const labMap = { 'lab a': 'gokongwei', 'lab b': 'andrew', 'lab c': 'velasco' };
            const labId = labMap[filters.lab.toLowerCase()] || filters.lab.toLowerCase();
            filtered = filtered.filter(r => r.lab === labId);
        }
        if (filters.status && filters.status !== 'all statuses') {
            filtered = filtered.filter(r => r.status === filters.status.toLowerCase());
        }

        const resultsP = document.querySelector('.results');
        if (resultsP) resultsP.textContent = `${filtered.length} reservation${filtered.length !== 1 ? 's' : ''} found`;

        const tbody = document.querySelector('tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        filtered.sort((a, b) => b.date.localeCompare(a.date)).forEach((r, i) => {
            const u = allUsers.find(x => x.id === r.userId);
            const lab = Store.getLab(r.lab);

            // check if 10-min removal window applies
            const resDateTime = new Date(`${r.date}T${r.slots[0]}:00`);
            const diffMin = (now - resDateTime) / 60000;
            const canRemove = r.date === Utils.today() && diffMin >= 0 && diffMin <= 10;

            const tr = document.createElement('tr');
            if (i % 2 === 1) tr.className = 'alt';
            tr.innerHTML = `
        <td><div class="seat">${r.seat}</div></td>
        <td>${lab?.name || r.lab}</td>
        <td>
          <div class="student">
            <p class="name">${r.anonymous ? 'Anonymous' : (u?.name || 'Unknown')}</p>
            <p class="email">${r.anonymous ? '—' : (u?.email || '')}</p>
          </div>
        </td>
        <td>
          <p>${Utils.formatDate(r.date)}</p>
          <span class="time">${Utils.slotsLabel(r.slots)}</span>
        </td>
        <td><span class="status ${r.status}">${r.status}</span></td>
        <td>
          <div class="actions">
            <button class="edit" title="Edit" data-id="${r.id}">✏️</button>
            <button class="delete" title="${canRemove ? 'Remove (no-show)' : 'Cancel'}" data-id="${r.id}">🗑️</button>
          </div>
        </td>`;
            tbody.appendChild(tr);

            tr.querySelector('.edit').onclick = () => this.openEditModal(r);
            tr.querySelector('.delete').onclick = () => {
                const msg = canRemove
                    ? `Remove reservation for ${u?.name || 'student'} (no-show within 10 min)?`
                    : `Cancel reservation for ${r.anonymous ? 'Anonymous' : (u?.name || 'student')}?`;
                Utils.confirm(msg, () => {
                    const all = Store.getReservations();
                    const idx = all.findIndex(x => x.id === r.id);
                    if (idx > -1) { all[idx].status = 'cancelled'; Store.saveReservations(all); }
                    Utils.toast('Reservation cancelled.', 'success');
                    this.renderAll(filters);
                });
            };
        });
    },

    bindFilters() {
        const getFilters = () => ({
            search: document.querySelector('.filters input')?.value,
            lab: document.querySelector('.filters select:nth-child(2)')?.value,
            status: document.querySelector('.filters select:nth-child(3)')?.value,
        });
        document.querySelectorAll('.filters input, .filters select').forEach(el => {
            el.addEventListener('input', () => this.renderAll(getFilters()));
        });
    },

    openEditModal(res) {
        const lab = Store.getLab(res.lab);
        const allSlots = Utils.allSlots();
        const reservations = Store.getReservations().filter(r =>
            r.lab === res.lab && r.date === res.date && r.id !== res.id && r.status !== 'cancelled'
        );
        const takenSlots = new Set();
        reservations.forEach(r => r.slots.forEach(s => takenSlots.add(`${r.seat}-${s}`)));
        let selectedSlots = [...res.slots];

        const overlay = document.createElement('div');
        overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;`;
        overlay.innerHTML = `
      <div style="background:white;border-radius:16px;padding:24px;max-width:480px;width:95%;box-shadow:0 20px 60px rgba(0,0,0,0.3);font-family:Inter,sans-serif;max-height:90vh;overflow-y:auto;">
        <h3 style="margin:0 0 4px;">Edit Reservation</h3>
        <p style="color:#666;font-size:14px;margin:0 0 4px;">${lab?.name} – Seat ${res.seat}</p>
        <p style="color:#666;font-size:13px;margin:0 0 16px;">${Utils.formatDate(res.date)}</p>
        <div style="margin-bottom:12px;">
          <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">Status</label>
          <select id="edit-status" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-family:inherit;">
            <option value="confirmed" ${res.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
            <option value="pending" ${res.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="cancelled" ${res.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </div>
        <p style="font-size:13px;font-weight:600;margin-bottom:8px;">Time Slots:</p>
        <div id="edit-slots" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:16px;max-height:200px;overflow-y:auto;"></div>
        <div style="display:flex;gap:10px;">
          <button id="ec-btn" style="flex:1;padding:10px;border:1px solid #ddd;border-radius:10px;cursor:pointer;font-family:inherit;">Cancel</button>
          <button id="es-btn" style="flex:1;padding:10px;background:#006B3F;color:white;border:none;border-radius:10px;cursor:pointer;font-weight:600;font-family:inherit;">Save</button>
        </div>
      </div>`;
        document.body.appendChild(overlay);

        const renderSlots = () => {
            const grid = overlay.querySelector('#edit-slots');
            grid.innerHTML = '';
            allSlots.forEach(slot => {
                const isTaken = takenSlots.has(`${res.seat}-${slot}`);
                const isSelected = selectedSlots.includes(slot);
                const btn = document.createElement('button');
                btn.style.cssText = `padding:6px 4px;border-radius:8px;font-size:11px;cursor:${isTaken ? 'not-allowed' : 'pointer'};
          border:1px solid ${isTaken ? '#fecaca' : isSelected ? '#006B3F' : '#ddd'};
          background:${isTaken ? '#fee2e2' : isSelected ? '#e8f5ee' : 'white'};
          color:${isTaken ? '#dc2626' : isSelected ? '#006B3F' : '#333'};font-family:inherit;`;
                btn.textContent = Utils.slotLabel(slot);
                btn.disabled = isTaken;
                if (!isTaken) btn.onclick = () => {
                    const idx = selectedSlots.indexOf(slot);
                    if (idx === -1) selectedSlots.push(slot); else selectedSlots.splice(idx, 1);
                    selectedSlots.sort();
                    renderSlots();
                };
                grid.appendChild(btn);
            });
        };
        renderSlots();

        overlay.querySelector('#ec-btn').onclick = () => overlay.remove();
        overlay.querySelector('#es-btn').onclick = () => {
            if (selectedSlots.length === 0) return Utils.toast('Select at least one time slot.', 'error');
            const all = Store.getReservations();
            const idx = all.findIndex(x => x.id === res.id);
            if (idx > -1) {
                all[idx].slots = selectedSlots;
                all[idx].status = overlay.querySelector('#edit-status').value;
                Store.saveReservations(all);
            }
            overlay.remove();
            Utils.toast('Reservation updated!', 'success');
            this.renderAll();
        };
    },
};

/* RESERVE FOR STUDENT (tech) */
const ReserveStudentPage = {
    selectedStudent: null,
    selectedLab: 'gokongwei',
    selectedDate: Utils.today(),
    selectedSeat: null,
    selectedSlots: [],

    init() {
        const user = Auth.requireLogin('technician');
        if (!user) return;
        Auth.addNavbar(user);

        // hide modal by default
        const modal = document.querySelector('.modal');
        if (modal) modal.style.display = 'none';

        // remove static success banner
        const successBanner = document.querySelector('.success');
        if (successBanner) successBanner.style.display = 'none';

        this.renderStudents();
        this.renderLabButtons();
        this.renderDateButtons();
        this.renderSeats();
        this.renderSlots();
        this.renderSummary();
        this.bindConfirm();
    },

    getStudents() {
        return Store.getUsers().filter(u => u.role === 'student');
    },

    renderStudents() {
        const studentList = document.querySelector('.student-list');
        const searchInput = document.querySelector('.search input');
        if (!studentList) return;

        const render = (query = '') => {
            studentList.innerHTML = '';
            const students = this.getStudents().filter(s =>
                !query || s.name.toLowerCase().includes(query) || s.email.toLowerCase().includes(query)
            );
            students.forEach(s => {
                const div = document.createElement('div');
                div.className = `student ${this.selectedStudent?.id === s.id ? 'selected' : ''}`;
                div.innerHTML = `
          <div class="avatar" style="background:${s.avatarColor || '#006B3F'}">${s.avatar || Utils.initials(s.name)}</div>
          <div class="info"><p>${s.name}</p><span>${s.email}</span></div>
          ${this.selectedStudent?.id === s.id ? '<span class="check">✓</span>' : ''}`;
                div.onclick = () => { this.selectedStudent = s; render(query); this.renderSummary(); };
                studentList.appendChild(div);
            });
        };
        render();
        if (searchInput) searchInput.oninput = (e) => render(e.target.value.toLowerCase());
    },

    renderLabButtons() {
        const labsBtns = document.querySelectorAll('.labs .lab');
        const labs = Store.getLabs();
        labsBtns.forEach((btn, i) => {
            if (labs[i]) {
                btn.textContent = labs[i].name.split(' ')[0];
                btn.dataset.lab = labs[i].id;
                btn.className = `lab ${labs[i].id === this.selectedLab ? 'active' : ''}`;
                btn.onclick = () => {
                    this.selectedLab = labs[i].id;
                    this.selectedSeat = null;
                    this.selectedSlots = [];
                    labsBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.renderSeats();
                    this.renderSlots();
                    this.renderSummary();
                };
            }
        });
    },

    renderDateButtons() {
        const datesBtns = document.querySelector('.dates');
        if (!datesBtns) return;
        datesBtns.innerHTML = Utils.next7Days().slice(0, 3).map(d => {
            const { day, date } = Utils.shortDay(d);
            return `<button class="date ${d === this.selectedDate ? 'active' : ''}" data-date="${d}"><span>${day}</span><span>${date}</span></button>`;
        }).join('');
        datesBtns.querySelectorAll('.date').forEach(btn => {
            btn.onclick = () => {
                this.selectedDate = btn.dataset.date;
                this.selectedSeat = null;
                this.selectedSlots = [];
                datesBtns.querySelectorAll('.date').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderSeats();
                this.renderSlots();
                this.renderSummary();
            };
        });
    },

    getLabReservations() {
        return Store.getReservations().filter(r =>
            r.lab === this.selectedLab && r.date === this.selectedDate && r.status !== 'cancelled'
        );
    },

    renderSeats() {
        const lab = Store.getLab(this.selectedLab);
        if (!lab) return;
        const seatsDiv = document.querySelector('.seats');
        if (!seatsDiv) return;
        const reservations = this.getLabReservations();
        const reservedSeats = new Set(reservations.map(r => r.seat));
        seatsDiv.innerHTML = '';
        for (let s = 1; s <= lab.seats && s <= 24; s++) {
            const btn = document.createElement('button');
            btn.className = `seat ${reservedSeats.has(s) ? 'reserved' : s === this.selectedSeat ? 'selected' : ''}`;
            btn.textContent = s;
            btn.disabled = reservedSeats.has(s);
            btn.onclick = () => {
                this.selectedSeat = s;
                this.selectedSlots = [];
                this.renderSeats();
                this.renderSlots();
                this.renderSummary();
            };
            seatsDiv.appendChild(btn);
        }
    },

    renderSlots() {
        const slotsDiv = document.querySelector('.slots');
        if (!slotsDiv) return;
        const allSlots = Utils.allSlots().slice(0, 12); // 7am–1pm
        const reservations = this.getLabReservations();
        const takenSlots = new Set();
        reservations.forEach(r => r.slots.forEach(s => takenSlots.add(`${r.seat}-${s}`)));

        slotsDiv.innerHTML = '';
        allSlots.forEach(slot => {
            const isTaken = this.selectedSeat && takenSlots.has(`${this.selectedSeat}-${slot}`);
            const isSelected = this.selectedSlots.includes(slot);
            const btn = document.createElement('button');
            btn.className = `slot ${isTaken ? 'reserved' : isSelected ? 'selected' : ''}`;
            btn.textContent = Utils.slotLabel(slot);
            btn.disabled = isTaken || !this.selectedSeat;
            btn.onclick = () => {
                const idx = this.selectedSlots.indexOf(slot);
                if (idx === -1) this.selectedSlots.push(slot); else this.selectedSlots.splice(idx, 1);
                this.selectedSlots.sort();
                this.renderSlots();
                this.renderSummary();
            };
            slotsDiv.appendChild(btn);
        });
    },

    renderSummary() {
        const lab = Store.getLab(this.selectedLab);
        const summaryItems = document.querySelectorAll('.summary-grid div');
        if (summaryItems[0]) summaryItems[0].innerHTML = `<p>Student</p><b>${this.selectedStudent?.name || '—'}</b>`;
        if (summaryItems[1]) summaryItems[1].innerHTML = `<p>Laboratory</p><b>${lab?.name || '—'}</b>`;
        if (summaryItems[2]) summaryItems[2].innerHTML = `<p>Seat</p><b>${this.selectedSeat ? `Seat ${this.selectedSeat}` : '—'}</b>`;
        if (summaryItems[3]) summaryItems[3].innerHTML = `<p>Date</p><b>${Utils.formatDate(this.selectedDate)}</b>`;

        const timeTags = document.querySelector('.time-tags');
        if (timeTags) {
            timeTags.innerHTML = this.selectedSlots.map(s => `<span>${Utils.slotLabel(s)}</span>`).join('') || '<span style="color:#999;background:#f5f5f5;">No slots selected</span>';
        }
    },

    bindConfirm() {
        const confirmBtn = document.querySelector('.confirm-btn');
        if (confirmBtn) {
            confirmBtn.onclick = () => {
                if (!this.selectedStudent) return Utils.toast('Please select a student.', 'error');
                if (!this.selectedSeat) return Utils.toast('Please select a seat.', 'error');
                if (this.selectedSlots.length === 0) return Utils.toast('Please select time slots.', 'error');

                const lab = Store.getLab(this.selectedLab);
                const modal = document.querySelector('.modal');
                if (modal) {
                    modal.style.display = 'flex';
                    const modalContent = modal.querySelector('.modal-content');
                    if (modalContent) {
                        const info = modalContent.querySelector('.modal-info');
                        if (info) {
                            info.innerHTML = `
                <div><span>Laboratory</span><b>${lab?.name}</b></div>
                <div><span>Seat</span><b>Seat ${this.selectedSeat}</b></div>
                <div><span>Date</span><b>${Utils.formatDate(this.selectedDate)}</b></div>
                <div><span>Slots</span><b>${this.selectedSlots.length} selected (${Utils.slotsLabel(this.selectedSlots)})</b></div>`;
                        }
                        const studentModal = modalContent.querySelector('.student-modal');
                        if (studentModal) {
                            studentModal.innerHTML = `
                <div class="avatar" style="background:${this.selectedStudent.avatarColor || '#006B3F'}">${this.selectedStudent.avatar || Utils.initials(this.selectedStudent.name)}</div>
                <div><p>${this.selectedStudent.name}</p><span>${this.selectedStudent.email}</span></div>`;
                        }
                    }
                    modal.querySelector('.cancel')?.addEventListener('click', () => modal.style.display = 'none');
                    const confirmModalBtn = modal.querySelector('.confirm');
                    // remove old listeners
                    const newBtn = confirmModalBtn.cloneNode(true);
                    confirmModalBtn.parentNode.replaceChild(newBtn, confirmModalBtn);
                    newBtn.addEventListener('click', () => {
                        const reservations = Store.getReservations();
                        const newRes = {
                            id: Store.generateId('r'),
                            userId: this.selectedStudent.id,
                            lab: this.selectedLab,
                            seat: this.selectedSeat,
                            date: this.selectedDate,
                            slots: [...this.selectedSlots],
                            status: 'confirmed',
                            anonymous: false,
                            bookedAt: Utils.today(),
                            note: 'Created by technician',
                        };
                        reservations.push(newRes);
                        Store.saveReservations(reservations);
                        modal.style.display = 'none';
                        Utils.toast(`Reservation created for ${this.selectedStudent.name}!`, 'success');
                        this.selectedStudent = null; this.selectedSeat = null; this.selectedSlots = [];
                        this.renderStudents(); this.renderSeats(); this.renderSlots(); this.renderSummary();
                    });
                }
            };
        }
    },
};

/* PROFILE */
const ProfilePage = {
    init() {
        const currentUser = Auth.requireLogin();
        if (!currentUser) return;
        Auth.addNavbar(currentUser);

        // check if viewing someone else's profile
        const params = new URLSearchParams(window.location.search);
        const viewId = params.get('id');
        const isOwnProfile = !viewId || viewId === currentUser.id;
        const targetUser = viewId ? Store.getUsers().find(u => u.id === viewId) : currentUser;

        if (!targetUser) {
            Utils.toast('User not found.', 'error');
            window.history.back();
            return;
        }

        // hide success banner initially
        const successBanner = document.querySelector('.success');
        if (successBanner) successBanner.style.display = 'none';

        this.renderProfile(targetUser, isOwnProfile, currentUser);
    },

    renderProfile(targetUser, isOwnProfile, currentUser) {
        // avatar
        const avatar = document.querySelector('.avatar');
        if (avatar) {
            avatar.textContent = targetUser.avatar || Utils.initials(targetUser.name);
            avatar.style.background = targetUser.avatarColor || '#006B3F';
        }

        // color picker (own profile only)
        const colorPicker = document.querySelector('.avatar-colors');
        if (colorPicker) {
            if (isOwnProfile) {
                colorPicker.innerHTML = Utils.avatarColors.map(c =>
                    `<div style="background:${c};width:18px;height:18px;border-radius:50%;cursor:pointer;border:2px solid ${c === targetUser.avatarColor ? '#333' : 'transparent'};" data-color="${c}"></div>`
                ).join('');
                colorPicker.querySelectorAll('div').forEach(dot => {
                    dot.onclick = () => {
                        const users = Store.getUsers();
                        const idx = users.findIndex(u => u.id === targetUser.id);
                        if (idx > -1) { users[idx].avatarColor = dot.dataset.color; Store.saveUsers(users); }
                        targetUser.avatarColor = dot.dataset.color;
                        if (avatar) avatar.style.background = dot.dataset.color;
                        colorPicker.querySelectorAll('div').forEach(d => d.style.borderColor = d.dataset.color === dot.dataset.color ? '#333' : 'transparent');
                    };
                });
            } else {
                colorPicker.style.display = 'none';
            }
        }

        // name, email, role
        const nameEl = document.querySelector('.profile-card h2');
        if (nameEl) nameEl.textContent = targetUser.name;
        const emailEl = document.querySelector('.profile-card .email');
        if (emailEl) emailEl.textContent = targetUser.email;
        const roleEl = document.querySelector('.role');
        if (roleEl) roleEl.textContent = `${targetUser.role === 'technician' ? '🔧' : '👨‍🎓'} ${targetUser.role}`;

        // stats
        const reservations = Store.getReservations().filter(r => r.userId === targetUser.id);
        const statDivs = document.querySelectorAll('.stat');
        if (statDivs[0]) statDivs[0].querySelector('b') && (statDivs[0].querySelector('b').textContent = reservations.length);
        if (statDivs[1]) statDivs[1].querySelector('b') && (statDivs[1].querySelector('b').textContent = reservations.filter(r => r.status === 'confirmed').length);
        if (statDivs[2]) statDivs[2].querySelector('b') && (statDivs[2].querySelector('b').textContent = reservations.filter(r => r.status !== 'cancelled' && r.date >= Utils.today()).length);

        // profile info fields
        const values = document.querySelectorAll('.value');
        if (values[0]) values[0].textContent = targetUser.name;
        if (values[1]) values[1].textContent = targetUser.email;
        if (values[2]) values[2].textContent = targetUser.role.charAt(0).toUpperCase() + targetUser.role.slice(1);
        if (values[3]) values[3].textContent = targetUser.bio || 'No bio yet.';

        // edit button
        const editBtn = document.querySelector('.edit-btn');
        if (editBtn) {
            if (!isOwnProfile) { editBtn.style.display = 'none'; }
            else {
                editBtn.onclick = () => this.openEditModal(targetUser);
            }
        }

        // current reservations
        const resCard = document.querySelector('.right .card:nth-child(2)');
        if (resCard) {
            const existing = resCard.querySelectorAll('.reservation');
            existing.forEach(el => el.remove());
            const upcoming = reservations.filter(r => r.status !== 'cancelled' && r.date >= Utils.today()).slice(0, 3);
            if (upcoming.length === 0) {
                resCard.insertAdjacentHTML('beforeend', '<p style="color:#999;font-size:14px;margin-top:8px;">No upcoming reservations.</p>');
            } else {
                upcoming.forEach(r => {
                    const lab = Store.getLab(r.lab);
                    resCard.insertAdjacentHTML('beforeend', `
            <div class="reservation">
              <div class="seat">${r.seat}</div>
              <div class="res-info">
                <p>${lab?.name} – Seat ${r.seat}</p>
                <span>${Utils.formatDate(r.date)} • ${Utils.slotsLabel(r.slots)}</span>
              </div>
              <div class="status ${r.status}">${r.status}</div>
            </div>`);
                });
            }
        }

        // danger zone
        const dangerCard = document.querySelector('.danger');
        if (dangerCard) {
            if (!isOwnProfile || targetUser.role === 'technician') {
                dangerCard.style.display = 'none';
            } else {
                const deleteBtn = dangerCard.querySelector('.delete-btn');
                if (deleteBtn) {
                    deleteBtn.onclick = () => {
                        Utils.confirm('Delete your account? This will cancel all your reservations and cannot be undone.', () => {
                            // cancel reservations
                            const reservations = Store.getReservations();
                            reservations.forEach(r => { if (r.userId === targetUser.id) r.status = 'cancelled'; });
                            Store.saveReservations(reservations);
                            // remove user
                            const users = Store.getUsers().filter(u => u.id !== targetUser.id);
                            Store.saveUsers(users);
                            Store.clearSession();
                            Utils.toast('Account deleted.', 'success');
                            setTimeout(() => window.location.href = 'ANIMOLABS.html', 1000);
                        });
                    };
                }
            }
        }
    },

    openEditModal(user) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;`;
        overlay.innerHTML = `
      <div style="background:white;border-radius:16px;padding:28px;max-width:440px;width:95%;box-shadow:0 20px 60px rgba(0,0,0,0.3);font-family:Inter,sans-serif;">
        <h3 style="margin:0 0 16px;">Edit Profile</h3>
        <div style="margin-bottom:14px;">
          <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">Full Name</label>
          <input id="ep-name" type="text" value="${user.name}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:10px;font-family:inherit;box-sizing:border-box;">
        </div>
        <div style="margin-bottom:14px;">
          <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">Bio / Description</label>
          <textarea id="ep-bio" rows="3" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:10px;font-family:inherit;resize:vertical;box-sizing:border-box;">${user.bio || ''}</textarea>
        </div>
        <div style="margin-bottom:16px;">
          <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">New Password (leave blank to keep current)</label>
          <input id="ep-pw" type="password" placeholder="New password..." style="width:100%;padding:10px;border:1px solid #ddd;border-radius:10px;font-family:inherit;box-sizing:border-box;">
        </div>
        <div style="display:flex;gap:10px;">
          <button id="ep-cancel" style="flex:1;padding:10px;border:1px solid #ddd;border-radius:10px;cursor:pointer;font-family:inherit;">Cancel</button>
          <button id="ep-save" style="flex:1;padding:10px;background:#006B3F;color:white;border:none;border-radius:10px;cursor:pointer;font-weight:600;font-family:inherit;">Save</button>
        </div>
      </div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('#ep-cancel').onclick = () => overlay.remove();
        overlay.querySelector('#ep-save').onclick = () => {
            const name = overlay.querySelector('#ep-name').value.trim();
            const bio = overlay.querySelector('#ep-bio').value.trim();
            const pw = overlay.querySelector('#ep-pw').value;
            if (!name) return Utils.toast('Name cannot be empty.', 'error');
            const users = Store.getUsers();
            const idx = users.findIndex(u => u.id === user.id);
            if (idx > -1) {
                users[idx].name = name;
                users[idx].bio = bio;
                users[idx].avatar = Utils.initials(name);
                if (pw) users[idx].password = pw;
                Store.saveUsers(users);
            }
            overlay.remove();
            const successBanner = document.querySelector('.success');
            if (successBanner) successBanner.style.display = 'block';
            Utils.toast('Profile updated!', 'success');
            this.renderProfile(users[idx], true, users[idx]);
        };
    },
};

/* SEARCH PAGE */
const SearchPage = {
    init() {
        const user = Auth.requireLogin();
        if (!user) return;
        Auth.addNavbar(user);
        this.bindSearch(user);
        this.renderResults({}, user);
    },

    bindSearch(user) {
        const btn = document.querySelector('.search-btn');
        if (btn) btn.onclick = () => this.renderResults(this.getFilters(), user);
        document.querySelectorAll('.field select').forEach(sel => {
            sel.onchange = () => this.renderResults(this.getFilters(), user);
        });
    },

    getFilters() {
        const selects = document.querySelectorAll('.field select');
        return {
            lab: selects[0]?.value,
            date: selects[1]?.value,
            from: selects[2]?.value,
            until: selects[3]?.value,
        };
    },

    renderResults(filters, user) {
        // get available seats
        const labs = Store.getLabs();
        const dates = Utils.next7Days();
        const allSlots = Utils.allSlots();

        const filteredLabs = filters.lab && filters.lab !== 'All Labs'
            ? labs.filter(l => l.name.toLowerCase().includes(filters.lab.toLowerCase()))
            : labs;

        const filteredDates = (filters.date && !filters.date.includes('Any'))
            ? dates.filter(d => { const { day, date } = Utils.shortDay(d); return (`${day}, ${date}`).includes(filters.date.replace('Mon, ', '').replace('Tue, ', '').replace('Wed, ', '')) || true; }).slice(0, 3)
            : dates;

        const resultsContainer = document.querySelector('.date-group')?.parentElement;
        if (!resultsContainer) return;

        // clear old results
        resultsContainer.querySelectorAll('.date-group').forEach(el => el.remove());

        let totalAvailable = 0;
        const groups = [];

        filteredDates.slice(0, 4).forEach(date => {
            const dateGroup = { date, labs: [] };
            filteredLabs.forEach(lab => {
                const reservations = Store.getReservations().filter(r => r.lab === lab.id && r.date === date && r.status !== 'cancelled');
                const reservedSeats = new Set(reservations.map(r => r.seat));
                const reservedSeatSlots = {};
                reservations.forEach(r => r.slots.forEach(s => { if (!reservedSeatSlots[r.seat]) reservedSeatSlots[r.seat] = new Set(); reservedSeatSlots[r.seat].add(s); }));

                const availableSeats = [];
                for (let s = 1; s <= lab.seats; s++) {
                    const takenSlots = reservedSeatSlots[s] || new Set();
                    const freeSlots = allSlots.filter(sl => {
                        if (takenSlots.has(sl)) return false;
                        if (filters.from && filters.from !== 'Any time' && sl < filters.from) return false;
                        if (filters.until && filters.until !== 'Any time' && sl >= filters.until) return false;
                        return true;
                    });
                    if (freeSlots.length > 0) {
                        availableSeats.push({ seat: s, freeSlots });
                        totalAvailable++;
                    }
                }
                if (availableSeats.length > 0) dateGroup.labs.push({ lab, availableSeats });
            });
            if (dateGroup.labs.length > 0) groups.push(dateGroup);
        });

        // update header
        const resultsHeader = document.querySelector('.results-header p');
        if (resultsHeader) resultsHeader.innerHTML = `Found <b>${totalAvailable}</b> available seat${totalAvailable !== 1 ? 's' : ''}`;

        if (groups.length === 0) {
            resultsContainer.insertAdjacentHTML('beforeend', `
        <div class="empty">
          <h3>No available slots found</h3>
          <p>Try adjusting your filters or choosing another date.</p>
        </div>`);
            return;
        }

        groups.forEach(group => {
            const groupEl = document.createElement('div');
            groupEl.className = 'date-group';
            groupEl.innerHTML = `<div class="date-label">${Utils.formatDateLong(group.date)}</div>`;

            group.labs.forEach(({ lab, availableSeats }) => {
                const labCard = document.createElement('div');
                labCard.className = 'lab-card';
                labCard.innerHTML = `
          <div class="lab-header">
            <div><b>${lab.name}</b><span> – ${lab.location}</span></div>
            <div class="available">${availableSeats.length} seat${availableSeats.length !== 1 ? 's' : ''} available</div>
          </div>
          <div class="seats"></div>`;

                const seatsDiv = labCard.querySelector('.seats');
                availableSeats.slice(0, 4).forEach(({ seat, freeSlots }) => {
                    const firstFree = Utils.slotLabel(freeSlots[0]);
                    const seatEl = document.createElement('div');
                    seatEl.className = 'seat-result';
                    seatEl.innerHTML = `
            <div class="seat-num">${seat}</div>
            <div class="seat-info">
              <p>Seat ${seat}</p>
              <span>${freeSlots.length} slot${freeSlots.length !== 1 ? 's' : ''} free (${firstFree}+)</span>
            </div>
            <button class="reserve">Reserve →</button>`;
                    seatEl.querySelector('.reserve').onclick = () => {
                        if (user.role !== 'student') return Utils.toast('Only students can reserve seats.', 'error');
                        window.location.href = `view-slots.html`;
                        sessionStorage.setItem('prefill_lab', lab.id);
                        sessionStorage.setItem('prefill_date', group.date);
                        sessionStorage.setItem('prefill_seat', seat);
                    };
                    seatsDiv.appendChild(seatEl);
                });
                groupEl.appendChild(labCard);
            });
            resultsContainer.appendChild(groupEl);
        });
    },
};

/* 5. ROUTER – detect page and init the right controller */
document.addEventListener('DOMContentLoaded', () => {
    const page = window.location.pathname.split('/').pop() || 'ANIMOLABS.html';

    // redirect logged-in users away from auth pages
    const authPages = ['login.html', 'register.html', 'ANIMOLABS.html', ''];
    const currentUser = Store.getCurrentUser();
    if (currentUser && authPages.includes(page)) {
        if (page === 'login.html' || page === 'register.html') {
            window.location.href = currentUser.role === 'technician' ? 'tech-dashboard.html' : 'student-dashboard.html';
            return;
        }
    }

    switch (page) {
        case '':
        case 'ANIMOLABS.html': LandingPage.init(); break;
        case 'register.html': RegisterPage.init(); break;
        case 'login.html': LoginPage.init(); break;
        case 'student-dashboard.html': StudentDashboard.init(); break;
        case 'tech-dashboard.html': TechDashboard.init(); break;
        case 'view-slots.html': ViewSlotsPage.init(); break;
        case 'my-reservations.html': MyReservationsPage.init(); break;
        case 'all-reservations.html':
            (async () => {
                const user = Auth.requireLogin('technician');
                if (!user) return;
                Auth.addNavbar(user);
                AllReservationsPage.renderAll();
                AllReservationsPage.bindFilters();
            })();
            break;
        case 'manage-reservations.html': ManageReservationsPage.init(); break;
        case 'reserve-student.html': ReserveStudentPage.init(); break;
        case 'profile.html': ProfilePage.init(); break;
        case 'search.html': SearchPage.init(); break;
        default: break;
    }
});