const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, 'port.env') });
console.log('Attempting to connect to:', process.env.MONGODB_URI);
const User = require('./models/User');
const Reservation = require('./models/Reservation');
const bcrypt = require('bcrypt');

const seedUsers = [
    {
        name: 'Juan Dela Cruz',
        email: 'juan.delacruz@dlsu.edu.ph',
        password: 'password123',
        role: 'student',
        bio: 'CS student who loves coding.',
        avatarColor: '#006B3F'
    },
    {
        name: 'Carlos Reyes',
        email: 'carlos.reyes@dlsu.edu.ph',
        password: 'password123',
        role: 'technician',
        bio: 'Lab technician at DLSU.',
        avatarColor: '#1d4ed8'
    },
    {
        name: 'Maria Santos',
        email: 'maria.santos@dlsu.edu.ph',
        password: 'password123',
        role: 'student',
        bio: 'Biology student.',
        avatarColor: '#7c3aed'
    },
    {
        name: 'Alice Santos',
        email: 'alice@dlsu.edu.ph',
        password: 'pass1',
        role: 'student',
        bio: '2nd year CS student',
        avatarColor: '#db2777'
    },
    {
        name: 'Emily Torres',
        email: 'emily@dlsu.edu.ph',
        password: 'pass5',
        role: 'student',
        bio: 'TA and tutor',
        avatarColor: '#0891b2'
    }
];

const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for seeding...');

        // Clear existing data
        await User.deleteMany({});
        await Reservation.deleteMany({});

        // Insert Users
        const saltRounds = 10;
        const hashedUsers = await Promise.all(seedUsers.map(async u => ({
            ...u,
            password: await bcrypt.hash(u.password, saltRounds)
        })));
        const createdUsers = await User.insertMany(hashedUsers);

        // Insert Reservations using the generated User IDs
        const reservations = [
            {
                userId: createdUsers[0]._id, // Juan
                lab: 'gokongwei',
                seat: 12,
                date: '2026-03-23',
                slots: ['10:00', '10:30'],
                status: 'confirmed',
                anonymous: false
            },
            {
                userId: createdUsers[0]._id, // Juan
                lab: 'andrew',
                seat: 8,
                date: '2026-03-25',
                slots: ['14:00', '14:30'],
                status: 'pending',
                anonymous: false
            },
            {
                userId: createdUsers[2]._id, // Maria
                lab: 'velasco',
                seat: 5,
                date: '2026-03-23',
                slots: ['12:00', '12:30'],
                status: 'confirmed',
                anonymous: true
            },
            {
                userId: createdUsers[3]._id, // Alice
                lab: 'gokongwei',
                seat: 1,
                date: '2026-03-24',
                slots: ['09:00', '09:30'],
                status: 'confirmed',
                anonymous: false
            },
            {
                userId: createdUsers[4]._id, // Emily
                lab: 'lab3',
                date: '2026-03-26',
                seat: 10,
                slots: ['08:00', '08:30'],
                status: 'confirmed',
                anonymous: false
            }
        ];

        await Reservation.insertMany(reservations);
        console.log('5 Reservations seeded successfully!');

        mongoose.connection.close();
        console.log('Seeding complete. Connection closed.');
    } catch (err) {
        console.error('Error seeding database:', err);
        process.exit(1);
    }
};

seedDatabase();