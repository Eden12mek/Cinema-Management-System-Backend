const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const axios = require('axios');
const Payment = require('../Models/Payment');

const initiatePayment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const {  amount, type, email, firstName, lastName, phoneNumber, tx_ref } = req.body;


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
        callback_url: `${process.env.BACKEND_URL}/api/payment/callback`,
        return_url: `${process.env.FRONTEND_URL}/payment-success`,
        'customization[title]': 'Ticket Payment',
        'customization[description]': 'Thank you for your purchase at Bahirdar Cinema',
      },
      {
        headers: {
          Authorization: 'Bearer CHASECK_TEST-tH9UqJt6mjhpd7vddLd1cnDAohZMrB49',
          'Content-Type': 'application/json',
        },
      }
    );

    if (chapaResponse.data.status === 'success') {
      const newPayment = new Payment({
       
        amount,
        tx_ref,
        type,
        status: 'success',
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
    console.error('Payment initiation error:', error);
    return res.status(500).json({ success: false, message: 'Payment initiation failed' });
  }
};

const paymentCallback = async (req, res) => {
  const { tx_ref, status } = req.body;

  try {
    if (status === 'success') {
      await Payment.updateOne({ tx_ref }, { status: 'success' });
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

module.exports = { initiatePayment, paymentCallback };