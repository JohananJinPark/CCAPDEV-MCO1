const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // No hashing required for Phase 2 [cite: 82]
    role: { type: String, enum: ['student', 'technician'], default: 'student' },
    bio: String,
    avatarColor: String
});
module.exports = mongoose.model('User', userSchema);