const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./models/User');
const Reservation = require('./models/Reservation');

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

// Auth helper
function requireLogin(req, res, next) {
    if (!req.session.userId) return res.redirect('/login');
    next();
}

// Page Routes
app.get('/', (req, res) =>
    res.sendFile(path.join(__dirname, 'views', 'ANIMOLABS.html')));

app.get('/login', (req, res) =>
    res.sendFile(path.join(__dirname, 'views', 'login.html')));

app.get('/register', (req, res) =>
    res.sendFile(path.join(__dirname, 'views', 'register.html')));

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

// Auth API

// Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email, password });
        if (user) {
            // Save user info into the session
            req.session.userId   = user._id.toString();
            req.session.userName = user.name;
            req.session.userRole = user.role;
            req.session.userEmail = user.email;

            if (user.role === 'technician') return res.redirect('/tech-dashboard');
            return res.redirect('/student-dashboard');
        }
        res.send("Invalid login. <a href='/login'>Try again</a>");
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

// Register
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser)
            return res.status(400).json({ message: "Email is already registered." });

        const newUser = new User({ name, email, password, role, avatarColor: '#006B3F' });
        await newUser.save();
        res.status(200).json({ success: true, message: "Account created successfully!" });
    } catch (err) {
        console.error("Registration error:", err);
        res.status(500).json({ message: "Server error creating account." });
    }
});

// Logout
app.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Current session user info (used by frontend)
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

//Reservations API

// GET all reservations (technician view)
app.get('/api/reservations', requireLogin, async (req, res) => {
    try {
        const reservations = await Reservation.find().populate('userId', 'name email');
        res.json(reservations);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching reservations' });
    }
});

// GET only the current user's reservations
app.get('/api/my-reservations', requireLogin, async (req, res) => {
    try {
        const reservations = await Reservation
            .find({ userId: req.session.userId })
            .populate('userId', 'name email');
        res.json(reservations);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching your reservations' });
    }
});

// POST create a new reservation
app.post('/api/reservations', requireLogin, async (req, res) => {
    try {
        const { lab, seat, date, slots, anonymous, note } = req.body;

        // Basic validation
        if (!lab || !seat || !date || !slots || slots.length === 0) {
            return res.status(400).json({ message: 'Missing required fields.' });
        }

        // Conflict check – same lab/seat/date and overlapping slots
        const existing = await Reservation.findOne({
            lab, seat: Number(seat), date,
            status: { $ne: 'cancelled' },
            slots: { $in: slots }
        });
        if (existing) {
            return res.status(409).json({ message: 'That seat/time is already reserved.' });
        }

        const newRes = new Reservation({
            userId: req.session.userId,
            lab,
            seat: Number(seat),
            date,
            slots,
            status: 'confirmed',
            anonymous: anonymous || false,
            note: note || ''
        });
        await newRes.save();
        res.status(201).json({ success: true, reservation: newRes });
    } catch (err) {
        console.error('Reservation error:', err);
        res.status(500).json({ message: 'Error creating reservation.' });
    }
});

// PATCH update reservation status (technician)
app.patch('/api/reservations/:id', requireLogin, async (req, res) => {
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

// DELETE cancel a reservation (owner or technician)
app.delete('/api/reservations/:id', requireLogin, async (req, res) => {
    try {
        const reservation = await Reservation.findById(req.params.id);
        if (!reservation) return res.status(404).json({ message: 'Not found.' });

        // Only owner or technician can cancel
        const isTech  = req.session.userRole === 'technician';
        const isOwner = reservation.userId.toString() === req.session.userId;
        if (!isTech && !isOwner)
            return res.status(403).json({ message: 'Not authorised.' });

        reservation.status = 'cancelled';
        await reservation.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Error cancelling reservation.' });
    }
});

// start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
    console.log(`Server running at http://localhost:${PORT}`));