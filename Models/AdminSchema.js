const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const adminSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true // Ensure that each admin's email is unique
    },
    password: {
        type: String,
        required: true
    },
    roleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
        required: true
    }
    

},{
    timestamps: true
});


adminSchema.pre('save', async function (next) {
    const admin = this;

    if (admin.isModified('password')) {
        admin.password = await bcrypt.hash(admin.password, 8);
    }

    next();
});

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;