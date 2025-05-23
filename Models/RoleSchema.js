const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const roleSchema = new mongoose.Schema({
    roleName: {
        type: String,
        required: true,
        unique: true 
    }
}, {
    timestamps: true
});

const Role = mongoose.model('Role', roleSchema);
module.exports = Role;