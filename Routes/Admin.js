// adminRoutes.js

const express = require('express');
const router = express.Router();
const Admin = require('../Models/AdminSchema'); // Import the Admin model
const bcrypt = require('bcrypt');
const errorHandler = require('../Middlewares/errorMiddleware');
const adminTokenHandler = require('../Middlewares/checkAdminToken');
const Booking = require('../Models/BookingSchema'); // Import the Booking model
const User = require('../Models/UserSchema'); // Import the User model

const Role = require('../Models/RoleSchema'); // Add this line with your other imports
const jwt = require('jsonwebtoken');

function createResponse(ok, message, data) {
    return {
        ok,
        message,
        data,
    };
}

router.post('/register', async (req, res, next) => {
    try {
          
        const { firstName,lastName, email, password, roleId } = req.body;

        // Check if the admin with the same email already exists
        const existingAdmin = await Admin.findOne({ email });

        if (existingAdmin) {
            return res.status(409).json(createResponse(false, 'Admin with this email already exists'));
        }

        // Hash the admin's password before saving it to the database


        const newAdmin = new Admin({
            firstName,
            lastName,
            email,
            password,
            roleId
        });

        await newAdmin.save(); // Await the save operation

        res.status(201).json(createResponse(true, 'Admin registered successfully'));
    } catch (err) {
        // Pass the error to the error middleware
        next(err);
    }
});
router.get('/all-admins', async (req, res, next) => {
    try {
      const admins = await Admin.find().populate('roleId', 'roleName');
  
      res.status(200).json(createResponse(true, 'All admins fetched successfully', admins));
    } catch (err) {
      next(err);
    }
  });
  
  router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email }).populate('roleId');

        if (!admin) {
            return res.status(400).json(createResponse(false, 'Invalid admin credentials'));
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(400).json(createResponse(false, 'Invalid admin credentials'));
        }

        const adminAuthToken = jwt.sign({ adminId: admin._id, roleId: admin.roleId._id }, process.env.JWT_ADMIN_SECRET_KEY, { expiresIn: '10m' });
        const adminrefreshToken = jwt.sign({ adminId: admin._id, roleId: admin.roleId._id }, process.env.JWT_ADMIN_REFRESH_SECRET_KEY, { expiresIn: '30m' });

        res.cookie('adminAuthToken', adminAuthToken, { httpOnly: true, secure: true, sameSite: 'None' });
        res.cookie('adminrefreshToken', adminrefreshToken, { httpOnly: true, secure: true, sameSite: 'None' });

        res.status(200).json(createResponse(true, 'Admin login successful', {
            adminAuthToken,
            adminrefreshToken,
            admin: {
                id: admin._id,
                email: admin.email,
                fullName: `${admin.firstName} ${admin.lastName}`,
                role: admin.roleId.roleName
                 // Include role name here
            },
            role: {
                id: admin.roleId._id,
                name: admin.roleId.roleName // Include role name here
            }
        }));
    } catch (err) {
        next(err);
    }
});

// routes/admin.js
router.put('/update/:id', async (req, res, next) => {
    try {
      const { id } = req.params; // Get admin ID from URL parameters
      const { firstName, lastName, email, password, roleId } = req.body; // Get updated fields
  
      // Check if the admin exists
      const admin = await Admin.findById(id);
      if (!admin) {
        return res.status(404).json(createResponse(false, 'Admin not found'));
      }
  
      // Check if the email is being updated and already exists for another admin
      if (email && email !== admin.email) {
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
          return res.status(409).json(createResponse(false, 'Admin with this email already exists'));
        }
      }
  
      // Update only the fields that are provided
      if (firstName) admin.firstName = firstName;
      if (lastName) admin.lastName = lastName;
      if (email) admin.email = email;
      if (password) admin.password = password; // Password will be hashed by pre-save hook
      if (roleId) admin.roleId = roleId;
  
      // Validate roleId exists in Role collection (optional, for extra validation)
      if (roleId) {
        const roleExists = await Role.findById(roleId);
        if (!roleExists) {
          return res.status(400).json(createResponse(false, 'Invalid role ID'));
        }
      }
  
      // Save the updated admin (pre-save hook will hash the password if modified)
      await admin.save();
  
      res.status(200).json(createResponse(true, 'Admin updated successfully'));
    } catch (err) {
      next(err);
    }
  });


// routes/adminRoutes.js
router.get('/checklogin', adminTokenHandler, async (req, res) => {
    try {
        const admin = await Admin.findById(req.adminId).select('-password');
        if (!admin) {
            return res.status(404).json(createResponse(false, 'Admin not found'));
        }

        res.json(createResponse(true, 'Admin authenticated successfully', {
            adminId: req.adminId,
            admin: {
                firstName: admin.firstName,
                lastName: admin.lastName,
                email: admin.email
            }
        }));
    } catch (err) {
        next(err);
    }
});

router.get('/logout', adminTokenHandler, async (req, res) => {
    res.clearCookie('adminAuthToken');
    res.clearCookie('adminrefreshToken');
    res.json({
        ok: true,
        message: 'Admin logged out successfully'
    })
})

router.get('/all-bookings', async (req, res, next) => {
    try {
        const bookings = await Booking.find()
            .populate('userId', 'firstName lastName email')
            .populate('movieId', 'title portraitImgUrl')
            .populate('screenId', 'name city');
            
        res.status(200).json(createResponse(true, 'All user bookings fetched successfully', bookings));
    } catch (err) {
        next(err);
    }
});

router.get('/all-users', async (req, res, next) => {
    try {
      const users = await User.find()
        .populate({
          path: 'bookings',
          populate: [
            { path: 'movieId', select: 'title genre rating duration' },
            { path: 'screenId', select: 'name location city screenType' },
            { path: 'userId', select: 'firstName lastName email' }
          ]
        });
  
      res.status(200).json(createResponse(true, 'All users fetched successfully', users));
    } catch (err) {
      next(err);
    }
  });
  
  router.put('/update-profile', adminTokenHandler, async (req, res, next) => {
    try {
      const { firstName, lastName, email, password } = req.body;
      const updates = { firstName, lastName, email };
  
      // Only update password if it was provided and not the placeholder
      if (password && password !== '********') {
        updates.password = await bcrypt.hash(password, 8);
      }
  
      const updatedAdmin = await Admin.findByIdAndUpdate(
        req.adminId,
        updates,
        { new: true, runValidators: true }
      ).select('-password');
  
      if (!updatedAdmin) {
        return res.status(404).json(createResponse(false, 'Admin not found'));
      }
  
      res.json(createResponse(true, 'Profile updated successfully', {
        admin: updatedAdmin
      }));
    } catch (err) {
      next(err);
    }
  });
// Delete (deactivate) user
router.delete('/delete-user/:id', adminTokenHandler, async (req, res) => {
  try {
      const userId = req.params.id;
      
      // Option 1: Actually delete the user
      // const deletedUser = await User.findByIdAndDelete(userId);
      
      // Option 2: Mark as inactive (recommended)
      const updatedUser = await User.findByIdAndUpdate(
          userId, 
          { isActive: false },
          { new: true }
      );

      if (!updatedUser) {
          return res.status(404).json(createResponse(false, 'User not found'));
      }

      res.json(createResponse(true, 'User deactivated successfully'));
  } catch (err) {
      next(err);
  }
});
// Reactivate user
router.put('/reactivate-user/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const updatedUser = await User.findByIdAndUpdate(
            userId, 
            { isActive: true },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json(createResponse(false, 'User not found'));
        }

        res.json(createResponse(true, 'User reactivated successfully'));
    } catch (err) {
        next(err);
    }
});
  

router.put('/update/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, password, roleId } = req.body;

    // Check if the admin exists
    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json(createResponse(false, 'Admin not found'));
    }

    // Check if the email is being updated and already exists for another admin
    if (email && email !== admin.email) {
      const existingAdmin = await Admin.findOne({ email });
      if (existingAdmin) {
        return res.status(409).json(createResponse(false, 'Admin with this email already exists'));
      }
    }

    // Update only the fields that are provided
    if (firstName) admin.firstName = firstName;
    if (lastName) admin.lastName = lastName;
    if (email) admin.email = email;
    if (password) admin.password = password; // Password will be hashed by pre-save hook
    if (roleId) {
      // Validate roleId exists in Role collection
      const roleExists = await Role.findById(roleId);
      if (!roleExists) {
        return res.status(400).json(createResponse(false, 'Invalid role ID'));
      }
      admin.roleId = roleId;
    }

    // Save the updated admin (pre-save hook will hash the password if modified)
    await admin.save();

    res.status(200).json(createResponse(true, 'Admin updated successfully'));
  } catch (err) {
    next(err);
  }
});

router.delete('/delete/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if the admin exists
    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json(createResponse(false, 'Admin not found'));
    }

    // Prevent deletion of the currently logged in admin
    if (req.adminId === id) {
      return res.status(400).json(createResponse(false, 'You cannot delete your own account'));
    }

    // Delete the admin
    await Admin.findByIdAndDelete(id);

    res.json(createResponse(true, 'Admin deleted successfully'));
  } catch (err) {
    next(err);
  }
});

// In your adminRoutes.js
router.get('/top-spenders', async (req, res, next) => {
  try {
    const topSpenders = await User.find()
      .sort({ totalSpent: -1 })
      .limit(10)
      .select('firstName lastName email totalSpent');
    
    res.status(200).json(createResponse(true, 'Top spenders fetched successfully', topSpenders));
  } catch (err) {
    next(err);
  }
});

router.use(errorHandler)

module.exports = router;