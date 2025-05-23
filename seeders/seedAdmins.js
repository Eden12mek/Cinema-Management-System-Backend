const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('../Models/AdminSchema');
const Role = require('../Models/RoleSchema');

// MongoDB connection URI
const MONGO_URI = 'mongodb://localhost:27017/Cinema-Ticket'; // Replace with your DB name

const seedAdmins = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Get all roles first
    const roles = await Role.find();
    if (roles.length === 0) {
      console.log('No roles found. Please seed roles first.');
      await mongoose.disconnect();
      return;
    }

    const adminUsers = [
      {
        firstName: 'Super',
        lastName: 'Admin',
        email: 'superadmin@cinema.com',
        password: 'Admin@1234',
        roleName: 'Admin'
      },
      {
        firstName: 'Theater',
        lastName: 'Manager',
        email: 'manager@cinema.com',
        password: 'Manager@1234',
        roleName: 'Manager'
      },
      {
        firstName: 'Event',
        lastName: 'Coordinator',
        email: 'event@cinema.com',
        password: 'Event@1234',
        roleName: 'Event Organizer'
      },
      {
        firstName: 'Customer',
        lastName: 'Support',
        email: 'support@cinema.com',
        password: 'Support@1234',
        roleName: 'Help Desk'
      }
    ];

    for (const user of adminUsers) {
      const existingAdmin = await Admin.findOne({ email: user.email });
      const role = roles.find(r => r.roleName === user.roleName);
      
      if (!role) {
        console.log(`Role ${user.roleName} not found. Skipping user ${user.email}`);
        continue;
      }

      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash(user.password, 8);
        
        const newAdmin = new Admin({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          password: hashedPassword,
          roleId: role._id
        });

        await newAdmin.save();
        console.log(`Admin ${user.email} created with ${user.roleName} role.`);
      } else {
        console.log(`Admin ${user.email} already exists.`);
      }
    }

    console.log('Admin seeding completed.');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error seeding admins:', error);
    mongoose.disconnect();
  }
};

seedAdmins();