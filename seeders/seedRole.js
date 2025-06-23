const mongoose = require('mongoose');
const Role = require('../Models/RoleSchema'); // Adjust the path accordingly

// MongoDB connection URI
const MONGO_URI = 'mongodb://localhost:27017/Cinema-Ticket'; // Replace with your DB name

// Seed roles
const seedRoles = async () => {
    try {
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        const roles = ['Admin', 'Manager', 'Organizer', 'Help Desk'];

        for (const roleName of roles) {
            const exists = await Role.findOne({ roleName });
            if (!exists) {
                await Role.create({ roleName });
                console.log(`Role ${roleName} added.`);
            } else {
                console.log(`Role ${roleName} already exists.`);
            }
        }

        console.log('Seeding completed.');
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error seeding roles:', error);
        mongoose.disconnect();
    }
};

seedRoles();
