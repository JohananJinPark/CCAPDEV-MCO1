const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lab: { type: String, required: true }, // e.g., 'gokongwei', 'andrew'
    seat: { type: Number, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    slots: [{ type: String }], // e.g., ['10:00', '10:30']
    status: { type: String, enum: ['confirmed', 'pending', 'cancelled'], default: 'confirmed' },
    anonymous: { type: Boolean, default: false },
    bookedAt: { type: String, default: () => new Date().toISOString().split('T')[0] },
    note: String
});

module.exports = mongoose.model('Reservation', reservationSchema);