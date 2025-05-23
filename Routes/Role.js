const express = require('express');
const router = express.Router();
const Role = require('../Models/RoleSchema'); // Import the Role model
const errorHandler = require('../Middlewares/errorMiddleware');
const adminTokenHandler = require('../Middlewares/checkAdminToken');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Admin = require('../Models/AdminSchema'); // Import the Admin model


function createResponse(ok, message, data) {
    return {
        ok,
        message,
        data,
    };
}

router.post('/add-role', adminTokenHandler, async (req, res, next) => {
    try {
        const { roleName } = req.body;

        // Check if the role already exists
        const existingRole = await Role.findOne({ roleName });

        if (existingRole) {
            return res.status(409).json(createResponse(false, 'Role already exists'));
        }

        const newRole = new Role({ roleName });
        await newRole.save(); // Await the save operation

        res.status(201).json(createResponse(true, 'Role added successfully'));
    } catch (err) {
        // Pass the error to the error middleware
        next(err);
    }
});

router.get('/all-roles', async (req, res, next) => {
  try {
    const roles = await Role.find().select('_id roleName');
    res.status(200).json(createResponse(true, 'All roles fetched successfully', roles));
  } catch (err) {
    next(err);
  }
});

router.delete('/delete-role/:id', adminTokenHandler, async (req, res, next) => {
    try {
        const { id } = req.params;

        // Check if the role exists
        const existingRole = await Role.findById(id);

        if (!existingRole) {
            return res.status(404).json(createResponse(false, 'Role not found'));
        }

        await Role.findByIdAndDelete(id); // Await the delete operation

        res.status(200).json(createResponse(true, 'Role deleted successfully'));
    } catch (err) {
        // Pass the error to the error middleware
        next(err);
    }
});

router.put('/update-role/:id', adminTokenHandler, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { roleName } = req.body;

        // Check if the role exists
        const existingRole = await Role.findById(id);

        if (!existingRole) {
            return res.status(404).json(createResponse(false, 'Role not found'));
        }

        // Update the role name
        existingRole.roleName = roleName;
        await existingRole.save(); // Await the save operation

        res.status(200).json(createResponse(true, 'Role updated successfully'));
    } catch (err) {
        // Pass the error to the error middleware
        next(err);
    }
});

router.get('/role/:id', adminTokenHandler, async (req, res, next) => {
    try {
        const { id } = req.params;

        // Check if the role exists
        const existingRole = await Role.findById(id);

        if (!existingRole) {
            return res.status(404).json(createResponse(false, 'Role not found'));
        }

        res.status(200).json(createResponse(true, 'Role fetched successfully', existingRole));
    } catch (err) {
        // Pass the error to the error middleware
        next(err);
    }
});

router.get('/role-by-name/:roleName', adminTokenHandler, async (req, res, next) => {
    try {
        const { roleName } = req.params;

        // Check if the role exists
        const existingRole = await Role.findOne({ roleName });

        if (!existingRole) {
            return res.status(404).json(createResponse(false, 'Role not found'));
        }

        res.status(200).json(createResponse(true, 'Role fetched successfully', existingRole));
    } catch (err) {
        // Pass the error to the error middleware
        next(err);
    }
});

router.use(errorHandler); // Use the error handling middleware

module.exports = router;