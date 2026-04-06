const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./models/User');
const Reservation = require('./models/Reservation');
const bcrypt = require('bcrypt');

dotenv.config({ path: path.join(__dirname, 'port.env') });

const app = express();

// Middleware 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.static('assets'));

// Session (keeps the logged-in user in memory between requests)
app.use(session({
    secret: 'animolabs-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 day
}));

// Database
console.log('Connecting to DB at:', process.env.MONGODB_URI);
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB!'))
    .catch(err => console.error('Database connection error:', err));

// BACK-END VALIDATION HELPERS

const DLSU_EMAIL_REGEX = /^[^\s@]+@dlsu\.edu(\.ph)?$/i;

const VALID_LABS = ['gokongwei', 'andrew', 'velasco', 'lab3'];

const VALID_SLOTS = [
    '08:00','08:30','09:00','09:30','10:00','10:30',
    '11:00','11:30','12:00','12:30','13:00','13:30',
    '14:00','14:30','15:00','15:30','16:00','16:30',
    '17:00','17:30','18:00','18:30'
];

const VALID_STATUSES = ['confirmed', 'pending', 'cancelled'];

/**
 * Validates a registration/user creation payload
 * Returns an array of error strings (empty = valid)
 */
function validateUserPayload({ name, email, password, role }) {
    const errors = [];

    // Name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        errors.push('Full name is required.');
    } else if (name.trim().length < 2) {
        errors.push('Full name must be at least 2 characters.');
    } else if (name.trim().length > 100) {
        errors.push('Full name must not exceed 100 characters.');
    }

    // Email
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
        errors.push('Email address is required.');
    } else if (!DLSU_EMAIL_REGEX.test(email.trim())) {
        errors.push('Email must be a valid @dlsu.edu.ph address.');
    }

    // Password
    if (!password || typeof password !== 'string') {
        errors.push('Password is required.');
    } else {
        if (password.length < 8) {
            errors.push('Password must be at least 8 characters.');
        }
        if (!/[A-Za-z]/.test(password)) {
            errors.push('Password must contain at least one letter.');
        }
        if (!/[0-9!@#$%^&*]/.test(password)) {
            errors.push('Password must contain at least one number or special character.');
        }
    }

    // Role
    if (role && !['student', 'technician'].includes(role)) {
        errors.push('Role must be either "student" or "technician".');
    }

    return errors;
}

/**
 * Validates a reservation creation payload
 * Returns an array of error strings (empty = valid)
 */
function validateReservationPayload({ lab, seat, date, slots }) {
    const errors = [];

    // Lab
    if (!lab || typeof lab !== 'string' || lab.trim() === '') {
        errors.push('Laboratory is required.');
    } else if (!VALID_LABS.includes(lab.trim().toLowerCase())) {
        errors.push(`Invalid laboratory. Must be one of: ${VALID_LABS.join(', ')}.`);
    }

    // Seat
    const seatNum = Number(seat);
    if (seat === undefined || seat === null || seat === '') {
        errors.push('Seat number is required.');
    } else if (!Number.isInteger(seatNum) || seatNum < 1 || seatNum > 60) {
        errors.push('Seat must be a whole number between 1 and 60.');
    }

    // Date
    if (!date || typeof date !== 'string' || date.trim() === '') {
        errors.push('Date is required.');
    } else {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date.trim())) {
            errors.push('Date must be in YYYY-MM-DD format.');
        } else {
            const d = new Date(date + 'T00:00:00');
            if (isNaN(d.getTime())) {
                errors.push('Date is not a valid calendar date.');
            } else {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (d < today) {
                    errors.push('Reservation date cannot be in the past.');
                }
            }
        }
    }

    // Slots
    if (!slots || !Array.isArray(slots) || slots.length === 0) {
        errors.push('At least one time slot is required.');
    } else if (slots.length > 22) {
        errors.push('You cannot book more than 22 time slots.');
    } else {
        const invalidSlots = slots.filter(s => !VALID_SLOTS.includes(s));
        if (invalidSlots.length > 0) {
            errors.push(`Invalid time slot(s): ${invalidSlots.join(', ')}.`);
        }
        const uniqueSlots = new Set(slots);
        if (uniqueSlots.size !== slots.length) {
            errors.push('Duplicate time slots are not allowed.');
        }
    }

    return errors;
}

/**
 * Validates a PATCH reservation update payload
 * Returns an array of error strings (empty = valid)
 */
function validateReservationUpdate(body) {
    const errors = [];
    const allowed = ['status', 'note', 'anonymous'];
    const keys = Object.keys(body);

    // Only allow certain fields to be patched
    const disallowed = keys.filter(k => !allowed.includes(k));
    if (disallowed.length > 0) {
        errors.push(`Fields not allowed to update: ${disallowed.join(', ')}.`);
    }

    if (body.status !== undefined) {
        if (!VALID_STATUSES.includes(body.status)) {
            errors.push(`Status must be one of: ${VALID_STATUSES.join(', ')}.`);
        }
    }

    if (body.note !== undefined && typeof body.note !== 'string') {
        errors.push('Note must be a string.');
    } else if (body.note && body.note.length > 500) {
        errors.push('Note must not exceed 500 characters.');
    }

    if (body.anonymous !== undefined && typeof body.anonymous !== 'boolean') {
        errors.push('Anonymous must be a boolean.');
    }

    return errors;
}

/**
 * Validates a profile PATCH payload
 * Returns an array of error strings (empty = valid)
 */
function validateProfileUpdate({ name, bio, avatarColor }) {
    const errors = [];

    if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length === 0) {
            errors.push('Name cannot be empty.');
        } else if (name.trim().length < 2) {
            errors.push('Name must be at least 2 characters.');
        } else if (name.trim().length > 100) {
            errors.push('Name must not exceed 100 characters.');
        }
    }

    if (bio !== undefined) {
        if (typeof bio !== 'string') {
            errors.push('Bio must be a string.');
        } else if (bio.length > 500) {
            errors.push('Bio must not exceed 500 characters.');
        }
    }

    if (avatarColor !== undefined) {
        if (typeof avatarColor !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(avatarColor)) {
            errors.push('Avatar color must be a valid hex color (e.g. #006B3F).');
        }
    }

    return errors;
}

// MIDDLEWARE

function requireLogin(req, res, next) {
    if (!req.session.userId) return res.redirect('/login');
    next();
}

function requireLoginAPI(req, res, next) {
    if (!req.session.userId)
        return res.status(401).json({ message: 'Not authenticated. Please log in.' });
    next();
}

function requireTechnician(req, res, next) {
    if (req.session.userRole !== 'technician')
        return res.status(403).json({ message: 'Access denied. Technician only.' });
    next();
}

// PAGE ROUTES

app.get('/', (req, res) =>
    res.sendFile(path.join(__dirname, 'views', 'ANIMOLABS.html')));

app.get('/login', (req, res) =>
    res.sendFile(path.join(__dirname, 'views', 'login.html')));

app.get('/register', (req, res) =>
    res.sendFile(path.join(__dirname, 'views', 'register.html')));

app.get('/register-tech', (req, res) =>
    res.sendFile(path.join(__dirname, 'views', 'register-tech.html')));

app.get('/student-dashboard', requireLogin, (req, res) =>
    res.sendFile(path.join(__dirname, 'views', 'student-dashboard.html')));

app.get('/tech-dashboard', requireLogin, (req, res) =>
    res.sendFile(path.join(__dirname, 'views', 'tech-dashboard.html')));

app.get('/view-slots', requireLogin, (req, res) =>
    res.sendFile(path.join(__dirname, 'views', 'view-slots.html')));

app.get('/my-reservations', requireLogin, (req, res) =>
    res.sendFile(path.join(__dirname, 'views', 'my-reservations.html')));

app.get('/search', requireLogin, (req, res) =>
    res.sendFile(path.join(__dirname, 'views', 'search.html')));

app.get('/all-reservations', requireLogin, (req, res) =>
    res.sendFile(path.join(__dirname, 'views', 'all-reservations.html')));

app.get('/manage-reservations', requireLogin, (req, res) =>
    res.sendFile(path.join(__dirname, 'views', 'manage-reservations.html')));

app.get('/reserve-student', requireLogin, (req, res) =>
    res.sendFile(path.join(__dirname, 'views', 'reserve-student.html')));

app.get('/profile', requireLogin, (req, res) =>
    res.sendFile(path.join(__dirname, 'views', 'profile.html')));

app.get('/about', (req, res) =>
    res.sendFile(path.join(__dirname, 'views', 'about.html')));

// AUTH API

// Login (POST) – back-end validation
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    /* Back-end validation */
    if (!email || typeof email !== 'string' || email.trim() === '') {
        return res.status(400).send("Email is required. <a href='/login'>Go back</a>");
    }
    if (!DLSU_EMAIL_REGEX.test(email.trim())) {
        return res.status(400).send("Must use a valid @dlsu.edu.ph email. <a href='/login'>Go back</a>");
    }
    if (!password || typeof password !== 'string' || password === '') {
        return res.status(400).send("Password is required. <a href='/login'>Go back</a>");
    }

    try {
        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if (user) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                req.session.userId = user._id;
                req.session.userRole = user.role;
                req.session.userName  = user.name;
                req.session.userEmail = user.email;
                if (user.role === 'technician') return res.redirect('/tech-dashboard');
                return res.redirect('/student-dashboard');
            }
        }
        // Generic message to avoid user enumeration
        res.status(401).send("Invalid email or password. <a href='/login'>Try again</a>");
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).send("Internal Server Error");
    }
});

// Register (POST) – back-end validation
app.post('/api/register', async (req, res) => {
    const { name, email, password, role } = req.body;

    /* Back-end validation */
    const errors = validateUserPayload({ name, email, password, role });
    if (errors.length > 0) {
        return res.status(400).json({ message: errors[0], errors });
    }

    try {
        const normalizedEmail = email.trim().toLowerCase();
        const existingUser    = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }

        const saltRounds     = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = new User({
            name:         name.trim(),
            email:        normalizedEmail,
            password:     hashedPassword,
            role:         role || 'student',
            avatarColor:  '#006B3F'
        });
        await newUser.save();
        res.status(200).json({ success: true, message: 'Account created successfully!' });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ message: 'Server error creating account.' });
    }
});

// Logout
app.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Current session user info
app.get('/api/me', (req, res) => {
    if (!req.session.userId)
        return res.status(401).json({ message: 'Not logged in' });
    res.json({
        userId: req.session.userId,
        name:   req.session.userName,
        role:   req.session.userRole,
        email:  req.session.userEmail
    });
});

// PROFILE API

// GET full profile
app.get('/api/profile', requireLoginAPI, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found.' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching profile.' });
    }
});

// PATCH update profile
app.patch('/api/profile', requireLoginAPI, async (req, res) => {
    const { name, bio, avatarColor } = req.body;

    /* Back-end validation */
    const errors = validateProfileUpdate({ name, bio, avatarColor });
    if (errors.length > 0) {
        return res.status(400).json({ message: errors[0], errors });
    }

    try {
        const updates = {};
        if (name        !== undefined) updates.name        = name.trim();
        if (bio         !== undefined) updates.bio         = bio.trim();
        if (avatarColor !== undefined) updates.avatarColor = avatarColor;

        const updated = await User.findByIdAndUpdate(
            req.session.userId,
            { $set: updates },
            { new: true }
        ).select('-password');

        if (!updated) return res.status(404).json({ message: 'User not found.' });

        // Update session name if changed
        if (name) req.session.userName = name.trim();

        res.json({ success: true, user: updated });
    } catch (err) {
        res.status(500).json({ message: 'Error updating profile.' });
    }
});

// DELETE account
app.delete('/api/profile', requireLoginAPI, async (req, res) => {
    try {
        await Reservation.updateMany(
            { userId: req.session.userId },
            { $set: { status: 'cancelled' } }
        );
        await User.findByIdAndDelete(req.session.userId);
        req.session.destroy();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting account.' });
    }
});

// RESERVATIONS API

// GET all reservations (technician)
app.get('/api/reservations', requireLoginAPI, async (req, res) => {
    try {
        const reservations = await Reservation.find().populate('userId', 'name email');
        res.json(reservations);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching reservations.' });
    }
});

// GET current user's reservations
app.get('/api/my-reservations', requireLoginAPI, async (req, res) => {
    try {
        const reservations = await Reservation
            .find({ userId: req.session.userId })
            .populate('userId', 'name email');
        res.json(reservations);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching your reservations.' });
    }
});

// POST create a reservation – back-end validation
app.post('/api/reservations', requireLoginAPI, async (req, res) => {
    const { lab, seat, date, slots, anonymous, note } = req.body;

    /* Back-end validation */
    const errors = validateReservationPayload({ lab, seat, date, slots });
    if (errors.length > 0) {
        return res.status(400).json({ message: errors[0], errors });
    }

    // Optional field sanitisation
    if (note !== undefined && typeof note !== 'string') {
        return res.status(400).json({ message: 'Note must be a string.' });
    }
    if (note && note.length > 500) {
        return res.status(400).json({ message: 'Note must not exceed 500 characters.' });
    }

    try {
        // Conflict check
        const existing = await Reservation.findOne({
            lab:    lab.trim().toLowerCase(),
            seat:   Number(seat),
            date:   date.trim(),
            status: { $ne: 'cancelled' },
            slots:  { $in: slots }
        });
        if (existing) {
            return res.status(409).json({ message: 'That seat and time slot are already reserved.' });
        }

        const newRes = new Reservation({
            userId:    req.session.userId,
            lab:       lab.trim().toLowerCase(),
            seat:      Number(seat),
            date:      date.trim(),
            slots,
            status:    'confirmed',
            anonymous: Boolean(anonymous),
            note:      note ? note.trim() : ''
        });
        await newRes.save();
        res.status(201).json({ success: true, reservation: newRes });
    } catch (err) {
        console.error('Reservation error:', err);
        res.status(500).json({ message: 'Error creating reservation.' });
    }
});


// POST reservation on behalf of a student (technician only)
app.post('/api/reservations/for-student', requireLoginAPI, async (req, res) => {
    if (req.session.userRole !== 'technician') {
        return res.status(403).json({ message: 'Only technicians can reserve for students.' });
    }

    const { studentId, lab, seat, date, slots, anonymous } = req.body;

    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({ message: 'Valid student ID is required.' });
    }

    try {
        const student = await User.findById(studentId);
        if (!student || student.role !== 'student') {
            return res.status(404).json({ message: 'Student not found.' });
        }

        const errors = validateReservationPayload({ lab, seat, date, slots });
        if (errors.length > 0) return res.status(400).json({ message: errors[0], errors });

        const existing = await Reservation.findOne({
            lab: lab.trim().toLowerCase(), seat: Number(seat), date: date.trim(),
            status: { $ne: 'cancelled' }, slots: { $in: slots }
        });
        if (existing) return res.status(409).json({ message: 'That seat and time slot are already reserved.' });

        const newRes = new Reservation({
            userId:    studentId,
            lab:       lab.trim().toLowerCase(),
            seat:      Number(seat),
            date:      date.trim(),
            slots,
            status:    'confirmed',
            anonymous: Boolean(anonymous),
            note:      'Reserved by technician'
        });
        await newRes.save();
        res.status(201).json({ success: true, reservation: newRes });
    } catch (err) {
        console.error('for-student error:', err);
        res.status(500).json({ message: 'Error creating reservation.' });
    }
});

// PATCH edit slots/anonymous on a reservation (owner or technician)
// NOTE: this must be defined BEFORE the generic PATCH /api/reservations/:id route
app.patch('/api/reservations/:id/edit', requireLoginAPI, async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid reservation ID.' });
    }

    const { slots, anonymous } = req.body;

    if (!slots || !Array.isArray(slots) || slots.length === 0) {
        return res.status(400).json({ message: 'At least one time slot is required.' });
    }
    const invalid = slots.filter(s => !VALID_SLOTS.includes(s));
    if (invalid.length > 0) {
        return res.status(400).json({ message: `Invalid slot(s): ${invalid.join(', ')}` });
    }

    try {
        const reservation = await Reservation.findById(req.params.id);
        if (!reservation) return res.status(404).json({ message: 'Reservation not found.' });

        const isTech  = req.session.userRole === 'technician';
        const isOwner = reservation.userId.toString() === req.session.userId.toString();
        if (!isTech && !isOwner) {
            return res.status(403).json({ message: 'Not authorised to edit this reservation.' });
        }

        const conflict = await Reservation.findOne({
            _id:    { $ne: reservation._id },
            lab:    reservation.lab,
            seat:   reservation.seat,
            date:   reservation.date,
            status: { $ne: 'cancelled' },
            slots:  { $in: slots }
        });
        if (conflict) {
            return res.status(409).json({ message: 'One or more selected slots are already taken.' });
        }

        reservation.slots = slots;
        if (anonymous !== undefined) reservation.anonymous = Boolean(anonymous);
        await reservation.save();
        res.json({ success: true, reservation });
    } catch (err) {
        res.status(500).json({ message: 'Error updating reservation.' });
    }
});

// PATCH update reservation (technician) – back-end validation
app.patch('/api/reservations/:id', requireLoginAPI, async (req, res) => {
    /* Back-end validation */
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid reservation ID.' });
    }

    const errors = validateReservationUpdate(req.body);
    if (errors.length > 0) {
        return res.status(400).json({ message: errors[0], errors });
    }

    try {
        const updated = await Reservation.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );
        if (!updated) return res.status(404).json({ message: 'Reservation not found.' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: 'Error updating reservation.' });
    }
});

// DELETE / cancel a reservation – back-end validation
app.delete('/api/reservations/:id', requireLoginAPI, async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid reservation ID.' });
    }

    try {
        const reservation = await Reservation.findById(req.params.id);
        if (!reservation) return res.status(404).json({ message: 'Reservation not found.' });

        const isTech  = req.session.userRole === 'technician';
        const isOwner = reservation.userId.toString() === req.session.userId.toString();

        if (!isTech && !isOwner) {
            return res.status(403).json({ message: 'You are not authorised to cancel this reservation.' });
        }

        reservation.status = 'cancelled';
        await reservation.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Error cancelling reservation.' });
    }
});

// STUDENTS API (for technician "Reserve for Student" page)

app.get('/api/students', requireLoginAPI, async (req, res) => {
    if (req.session.userRole !== 'technician') {
        return res.status(403).json({ message: 'Access denied.' });
    }
    try {
        const students = await User.find({ role: 'student' }).select('-password');
        res.json(students);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching students.' });
    }
});

// START SERVER

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
    console.log(`Server running at http://localhost:${PORT}`));