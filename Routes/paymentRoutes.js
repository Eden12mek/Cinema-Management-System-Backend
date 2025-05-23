const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const paymentController = require('../Controller/paymentController');

const paymentValidationRules = [
  body('userId').isString().withMessage('User ID must be a string'), // Changed to string for MongoDB ObjectId
  body('screenId').isString().withMessage('Screen ID must be a string'),
  body('movieId').isString().withMessage('Movie ID must be a string'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
  body('type').isString().withMessage('Type must be a string'),
  body('email').isEmail().withMessage('Invalid email format'),
  body('firstName').isString().withMessage('First name must be a string'),
  body('lastName').isString().withMessage('Last name must be a string'),
  body('phoneNumber').isString().withMessage('Phone number must be a string')
];

router.post('/initiate', paymentValidationRules, paymentController.initiatePayment);
router.post('/confirm', paymentController.confirmPayment);
router.post('/callback', paymentController.paymentCallback);

module.exports = router;