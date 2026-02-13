// Simple Lab Reservation System using localStorage

let currentUser = null;
let labs = { lab1: 10, lab2: 10, lab3: 12 }; // include lab3 for MCO requirement
const slots = generateSlots(); // 30-min intervals

// Sample users (at least 5) for front-end/demo
const sampleUsers = [
    { email: 'alice@dlsu.edu.ph', name: 'Alice Santos', password: 'pass1', role: 'student', description: '2nd year CS student', pic: '' },
    { email: 'benjamin@dlsu.edu.ph', name: 'Benjamin Cruz', password: 'pass2', role: 'student', description: 'Robotics enthusiast, 3rd year', pic: '' },
    { email: 'carla@dlsu.edu.ph', name: 'Carla Reyes', password: 'pass3', role: 'student', description: 'Information Systems, student assistant', pic: '' },
    { email: 'daniel@dlsu.edu.ph', name: 'Daniel Lee', password: 'techpass', role: 'technician', description: 'Lab technician for CS labs', pic: '' },
    { email: 'emily@dlsu.edu.ph', name: 'Emily Torres', password: 'pass5', role: 'student', description: 'TA and tutor', pic: '' }
];

// Sample reservations (at least 5)
const sampleReservations = [
    { id: 1, user: 'alice@dlsu.edu.ph', lab: 'lab1', date: getDateOffset(0), slots: ['09:00'], anonymous: false },
    { id: 2, user: 'benjamin@dlsu.edu.ph', lab: 'lab1', date: getDateOffset(0), slots: ['09:30','10:00'], anonymous: false },
    { id: 3, user: 'carla@dlsu.edu.ph', lab: 'lab2', date: getDateOffset(1), slots: ['11:00'], anonymous: true },
    { id: 4, user: 'emily@dlsu.edu.ph', lab: 'lab3', date: getDateOffset(2), slots: ['08:00','08:30'], anonymous: false },
    { id: 5, user: 'alice@dlsu.edu.ph', lab: 'lab2', date: getDateOffset(3), slots: ['14:00'], anonymous: false }
];

function generateSlots() {
    const slots = [];
    for (let hour = 8; hour < 17; hour++) {
        for (let min = 0; min < 60; min += 30) {
            slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
        }
    }
    return slots;
}

// Utility: return YYYY-MM-DD for today + offset days
function getDateOffset(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
}

function loadUsers() {
    const raw = localStorage.getItem('users');
    if (!raw) {
        saveUsers(sampleUsers);
        return sampleUsers.slice();
    }
    return JSON.parse(raw || '[]');
}

function saveUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
}

function loadReservations() {
    const raw = localStorage.getItem('reservations');
    if (!raw) {
        saveReservations(sampleReservations);
        return sampleReservations.slice();
    }
    return JSON.parse(raw || '[]');
}

function saveReservations(reservations) {
    localStorage.setItem('reservations', JSON.stringify(reservations));
}

function showView(viewId) {
    document.querySelectorAll('main > div').forEach(div => div.style.display = 'none');
    document.getElementById(viewId).style.display = 'block';
}

function updateNav() {
    const nav = document.getElementById('nav');
    if (currentUser) {
        nav.innerHTML = `<button id="dashboardBtn">Dashboard</button><button id="usersBtn">Users</button><button id="profileBtn">My Profile</button><button id="logoutBtn">Logout</button>`;
    } else {
        nav.innerHTML = `<button id="dashboardBtn">Dashboard</button><button id="usersBtn">Users</button><button id="loginBtn">Login</button><button id="registerBtn">Register</button>`;
    }
    attachNavEvents();
}

function attachNavEvents() {
    document.getElementById('loginBtn')?.addEventListener('click', () => showView('loginForm'));
    document.getElementById('registerBtn')?.addEventListener('click', () => showView('registerForm'));
    document.getElementById('dashboardBtn')?.addEventListener('click', () => { showView('dashboard'); loadDashboard(); });
    document.getElementById('profileBtn')?.addEventListener('click', () => { showView('profile'); loadProfile(); });
    document.getElementById('logoutBtn')?.addEventListener('click', () => { currentUser = null; updateNav(); showView('dashboard'); });
    document.getElementById('usersBtn')?.addEventListener('click', () => { showView('users'); loadUsersList(); });
}

// Login
document.getElementById('submitLogin').addEventListener('click', () => {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const users = loadUsers();
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        currentUser = user;
        updateNav();
        showView('dashboard');
        loadDashboard();
    } else {
        alert('Invalid credentials');
    }
});

// Register
document.getElementById('submitRegister').addEventListener('click', () => {
    const email = document.getElementById('regEmail').value;
    const name = document.getElementById('regName').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;
    if (email && name && password) {
        const users = loadUsers();
        users.push({ email, name, password, role, description: '', pic: '' });
        saveUsers(users);
        alert('Registered successfully');
        showView('loginForm');
    }
});

// Dashboard
function loadDashboard() {
    loadReservationsList();
    document.getElementById('dateSelect').value = new Date().toISOString().split('T')[0];
}

document.getElementById('viewAvailability').addEventListener('click', () => {
    const lab = document.getElementById('labSelect').value;
    const date = document.getElementById('dateSelect').value;
    const reservations = loadReservations();
    // build slot -> reservations mapping for this lab/date
    const slotMap = {};
    reservations.filter(r => r.lab === lab && r.date === date).forEach(r => {
        r.slots.forEach(s => {
            slotMap[s] = slotMap[s] || [];
            slotMap[s].push(r);
        });
    });
    const slotsDiv = document.getElementById('slots');
    slotsDiv.innerHTML = '';
    slots.forEach(slot => {
        const div = document.createElement('div');
        const occupiedHere = slotMap[slot] && slotMap[slot].length > 0;
        div.className = 'slot ' + (occupiedHere ? 'occupied' : 'available');
        div.textContent = slot;
        if (occupiedHere) {
            const first = slotMap[slot][0];
            if (!first.anonymous) {
                const users = loadUsers();
                const u = users.find(x => x.email === first.user);
                if (u) {
                    const a = document.createElement('a');
                    a.href = '#';
                    a.textContent = ' — ' + u.name;
                    a.style.marginLeft = '6px';
                    a.addEventListener('click', (e) => { e.preventDefault(); showUserProfile(u.email); });
                    div.appendChild(a);
                }
            }
        } else {
            if (currentUser) div.addEventListener('click', () => reserveSlot(lab, date, slot));
        }
        slotsDiv.appendChild(div);
    });
});

function reserveSlot(lab, date, slot) {
    const reservations = loadReservations();
    if (!currentUser) { alert('Please login as a student to reserve.'); return; }
    reservations.push({ id: Date.now(), user: currentUser.email, lab, date, slots: [slot], anonymous: false });
    saveReservations(reservations);
    loadReservationsList();
    document.getElementById('viewAvailability').click(); // Refresh
}

function loadReservationsList() {
    const reservations = loadReservations();
    const list = document.getElementById('reservationList');
    list.innerHTML = '';
    const mine = currentUser ? reservations.filter(r => r.user === currentUser.email) : reservations.slice(0, 5);
    mine.forEach(r => {
        const li = document.createElement('li');
        li.textContent = `${r.lab} - ${r.date} ${r.slots.join(', ')}${r.anonymous ? ' (anonymous)' : ''}`;
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => editReservation(r));
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => removeReservation(r.id));
        li.appendChild(editBtn);
        li.appendChild(removeBtn);
        list.appendChild(li);
    });
}

function editReservation(res) {
showView('dashboard');

    document.getElementById('labSelect').value = res.lab;
    document.getElementById('dateSelect').value = res.date;
    document.getElementById('viewAvailability').click();

    removeReservation(res.id);
    alert(`Editing reservation for ${res.lab}. Please select a new slot or re-confirm your current one.`);
}

function removeReservation(id) {
    const reservations = loadReservations();
    saveReservations(reservations.filter(r => r.id !== id));
    loadReservationsList();
    showView('dashboard');
}

// Search
document.getElementById('searchBtn').addEventListener('click', () => {
    const date = document.getElementById('searchDate').value;
    const time = document.getElementById('searchTime').value;
    const lab = document.getElementById('searchLab').value;
    const reservations = loadReservations();
    const occupied = reservations.filter(r => r.lab === lab && r.date === date).flatMap(r => r.slots);
    const results = slots.filter(slot => !occupied.includes(slot) && slot >= time);
    document.getElementById('searchResults').innerHTML = results.length ? results.join(', ') : 'No free slots';
});

// Profile
function loadProfile() {
    if (!currentUser) {
        document.getElementById('profileDesc').value = '';
        document.getElementById('profileView').innerHTML = `<p>Please login to edit your profile.</p>`;
        return;
    }
    document.getElementById('profileDesc').value = currentUser.description || '';
    document.getElementById('profileView').innerHTML = `<p>${currentUser.name}</p><p>${currentUser.description}</p>`;
}

document.getElementById('saveProfile').addEventListener('click', () => {
    const desc = document.getElementById('profileDesc').value;
    const users = loadUsers();
    const user = users.find(u => u.email === currentUser.email);
    if (user) {
        user.description = desc;
        saveUsers(users);
        currentUser = user;
        loadProfile();
    }
});

// Users listing and public profile (front-end only)
function loadUsersList() {
    const users = loadUsers();
    const ul = document.getElementById('usersList');
    ul.innerHTML = '';
    users.forEach(u => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#';
        a.textContent = `${u.name} (${u.role})`;
        a.addEventListener('click', (e) => { e.preventDefault(); showUserProfile(u.email); });
        li.appendChild(a);
        ul.appendChild(li);
    });
}

function showUserProfile(email) {
    const users = loadUsers();
    const user = users.find(u => u.email === email);
    if (!user) { alert('User not found'); return; }
    showView('profile');
    document.getElementById('profileView').innerHTML = `<h3>${user.name}</h3><p>${user.description}</p><p>Role: ${user.role}</p>`;
    const reservations = loadReservations().filter(r => r.user === email);
    if (reservations.length) {
        const ul = document.createElement('ul');
        reservations.forEach(r => {
            const li = document.createElement('li');
            li.textContent = `${r.lab} — ${r.date} ${r.slots.join(', ')}${r.anonymous ? ' (anonymous)' : ''}`;
            ul.appendChild(li);
        });
        document.getElementById('profileView').appendChild(ul);
    }
}

// Periodic refresh for availability when dashboard visible
setInterval(() => {
    if (document.getElementById('dashboard').style.display !== 'none') {
        document.getElementById('viewAvailability').click();
    }
}, 30000);

// Init
// ensure sample data present, then initialize UI
loadUsers();
loadReservations();
updateNav();
showView('dashboard');