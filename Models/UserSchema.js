const mongoose = require('mongoose');
const bcrypt = require('bcrypt');


const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    password:{
        type: String,
        required: true,
    },
    email:{
        type: String,
        required: true,
        unique: true
    },
    bookings:{
        type: Array,
        default: [],
    },
    city:{
        type: String,
        required: true,
    },
     totalSpent: {
    type: Number,
    default: 0
  },
  discountTier: {
    type: Number,
    default: 0 // 0 = no discount, 1 = 5%, 2 = 10%, etc.
  },
  lastBookingDate: Date
},{
    timestamps: true
})

userSchema.pre('save', async function (next) {
    const user = this;

    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8);
    }

    next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;