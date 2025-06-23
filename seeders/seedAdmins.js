const mongoose = require('mongoose');
const Admin = require('../Models/AdminSchema'); // Adjust path as needed
const Role = require('../Models/RoleSchema');   // Adjust path as needed

const MONGO_URI = 'mongodb://localhost:27017/Cinema-Ticket';

const seedAdmin = async () => {
    try {
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        // Get roleId for 'Admin'
        const adminRole = await Role.findOne({ roleName: 'Admin' });

        if (!adminRole) {
            throw new Error("Admin role not found. Please seed roles first.");
        }

        const existingAdmin = await Admin.findOne({ email: 'admin@cinema.com' });
        if (existingAdmin) {
            console.log('Admin already exists.');
        } else {
            const newAdmin = new Admin({
                firstName: 'Super',
                lastName: 'Admin',
                email: 'admin@cinema.com',
                password: 'admin123', // Will be hashed automatically
                roleId: adminRole._id
            });

            await newAdmin.save();
            console.log('Admin user seeded successfully.');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error seeding admin:', error);
        mongoose.disconnect();
    }
};

seedAdmin();
