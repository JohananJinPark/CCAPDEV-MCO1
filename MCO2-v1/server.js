const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, 'port.env') });
dotenv.config();
const app = express();

// Middleware to handle JSON data and static files
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // This allows reading form data
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

//Route to Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (user) {
        res.json({ success: true, user });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
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

const User = require('./models/User');

// Required middleware to read the form data
app.use(express.urlencoded({ extended: true }));

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });

    if (user) {
        // DO NOT use res.json(user) or res.send(user)
        // USE res.redirect to move the browser to a new page
        if (user.role === 'technician') {
            res.redirect('/tech-dashboard');
        } else {
            res.redirect('/student-dashboard');
        }
    } else {
        res.send("Invalid login. <a href='/login'>Try again</a>");
    }
});