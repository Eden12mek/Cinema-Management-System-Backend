
const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const request = require('request');
const Payment = require('../Models/Payment'); // Adjust the path as necessary

const initiatePayment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { userId, screenId, movieId, amount, type, email, firstName, lastName, phoneNumber } = req.body;
  const tx_ref = `tx-${uuidv4()}`;

  try {
    const chapaResponse = await axios.post(
      'https://api.chapa.co/v1/transaction/initialize',
      {
        amount,
        currency: 'ETB',
        email,
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        tx_ref,
        callback_url: 'http://localhost:7000/api/payment/callback',
        return_url: 'http://localhost:3000/payment-success',
        'customization[title]': 'Payment for your service',
        'customization[description]': 'Enjoy your service',
        'meta[hide_receipt]': 'true'
      },
      {
        headers: {
          Authorization: 'Bearer CHASECK_TEST-tH9UqJt6mjhpd7vddLd1cnDAohZMrB49', 
          'Content-Type': 'application/json',
        },
      }
    );

    if (chapaResponse.data.status === 'success') {
      // Create new payment document
      const newPayment = new Payment({
        user_id: userId,
        screen_id: screenId,
        movie_id: movieId,
        amount,
        tx_ref,
        type,
        status: 'pending'
      });

      await newPayment.save();

      res.json({
        success: true,
        tx_ref,
        checkout_url: chapaResponse.data.data.checkout_url,
        message: 'Chapa payment initiated',
      });
    } else {
      return res.status(500).json({ success: false, message: 'Failed to initiate payment with Chapa' });
    }

  } catch (error) {
    if (error.response) {
      console.error('🔴 Chapa API error:', error.response.data);
      return res.status(500).json({
        success: false,
        message: error.response.data.message || 'Chapa API error',
        chapaError: error.response.data,
      });
    } else if (error.request) {
      console.error('🟠 No response from Chapa:', error.request);
      return res.status(500).json({ success: false, message: 'No response from Chapa' });
    } else {
      console.error('🟡 Unexpected error:', error.message);
      return res.status(500).json({ success: false, message: 'Unexpected error occurred' });
    }
  }
};

const confirmPayment = async (req, res) => {
  const { tx_ref } = req.body;
  console.log('Verifying payment with tx_ref:', tx_ref);

  try {
    const payment = await Payment.findOne({ tx_ref });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const options = {
      method: 'GET',
      url: `https://api.chapa.co/v1/transaction/verify/${tx_ref}`,
      headers: {
        'Authorization': 'Bearer CHASECK_TEST-tH9UqJt6mjhpd7vddLd1cnDAohZMrB49',
      },
    };

    request(options, async (error, response) => {
      if (error) {
        console.error("Chapa API request error:", error);
        return res.status(500).json({ success: false, message: 'Error verifying payment' });
      }

      try {
        const chapaResponse = JSON.parse(response.body);
        console.log("Chapa API response:", chapaResponse);

        if (chapaResponse.status === 'success' && chapaResponse.data?.status === 'success') {
          await Payment.updateOne({ tx_ref }, { status: 'success' });
          const updatedPayment = await Payment.findOne({ tx_ref });
          return res.json({ success: true, message: 'Payment successful', payment: updatedPayment });
        } else {
          return res.json({ 
            success: false, 
            message: 'Payment failed or not verified',
            details: chapaResponse.message || 'No additional error details'
          });
        }
      } catch (parseError) {
        console.error("Error parsing Chapa response:", parseError);
        return res.status(500).json({ success: false, message: 'Invalid response from Chapa' });
      }
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
const paymentCallback = async (req, res) => {
  const { tx_ref, status } = req.body;
  
  try {
    if (status === 'success') {
      await Payment.updateOne({ tx_ref }, { status: 'success' });
      
      // Here you can also update your booking status
      // await Booking.updateOne({ paymentId: tx_ref }, { status: 'confirmed' });
      
      return res.status(200).send('Callback processed');
    } else {
      await Payment.updateOne({ tx_ref }, { status: 'failed' });
      return res.status(200).send('Callback processed - payment failed');
    }
  } catch (error) {
    console.error('Callback processing error:', error);
    return res.status(500).send('Error processing callback');
  }
};

module.exports = {
  initiatePayment,
  confirmPayment,
  paymentCallback,
};