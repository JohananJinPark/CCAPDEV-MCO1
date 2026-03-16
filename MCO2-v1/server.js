const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
const app = express();

// Middleware to handle JSON data and static files
app.use(express.json());
app.use(express.static('public')); 

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