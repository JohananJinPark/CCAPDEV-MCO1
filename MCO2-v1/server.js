const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'port.env') });
dotenv.config();
const app = express();

// Middleware to handle JSON data and static files
app.use(express.json());
app.use(express.static('public')); 
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