const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./models/User');
const Reservation = require('./models/Reservation');

require('dotenv').config({ path: path.join(__dirname, 'port.env') });
dotenv.config();
const app = express();

// Middleware to handle JSON data and static files
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use(express.static('assets'));
console.log('Connecting to DB at:', process.env.MONGODB_URI);
// Connect to MongoDB (ensure your .env has MONGODB_URI)
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB!'))
    .catch(err => console.error('Database connection error:', err));

// Route to serve your landing page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'ANIMOLABS.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});

// Route to get reservation
app.get('/api/reservations', async (req, res) => {
    const reservations = await Reservation.find().populate('userId', 'name email');
    res.json(reservations);
});

// Landing Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'ANIMOLABS.html'));
});

// Login Route
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Registration Route
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

// Dashboards
app.get('/student-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'student-dashboard.html'));
});

app.get('/tech-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'tech-dashboard.html'));
});

// View Slots
app.get('/view-slots', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'view-slots.html'));
});

// My Reservations
app.get('/my-reservations', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'my-reservations.html'));
});

// Route To Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user in MongoDB
        const user = await User.findOne({ email, password });

        if (user) {
            // SUCCESS: Redirect to the correct dashboard
            if (user.role === 'technician') {
                return res.redirect('/tech-dashboard');
            } else {
                return res.redirect('/student-dashboard');
            }
        } else {
            // FAILURE: Send an error message with a link back
            res.send("Invalid login. <a href='/login'>Try again</a>");
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

// Route to Register
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // 1. Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email is already registered." });
        }

        // 2. Save new user to MongoDB
        const newUser = new User({
            name, email, password, role, avatarColor: '#006B3F'
        });
        await newUser.save();

        res.status(200).json({ success: true, message: "Account created successfully!" });
    } catch (err) {
        console.error("Registration error:", err);
        res.status(500).json({ message: "Server error creating account." });
    }
});

app.get('/search', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'search.html'));
});

app.get('/all-reservations', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'all-reservations.html'));
});

app.get('/manage-reservations', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'manage-reservations.html'));
});

app.get('/reserve-student', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'reserve-student.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'profile.html'));
});