const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const PORT = 7000;
const cookieParser = require('cookie-parser');
const axios = require('axios');

const authRoutes = require('./Routes/Auth');
const adminRoutes = require('./Routes/Admin');
const movieRoutes = require('./Routes/Movie');
const imageuploadRoutes = require('./Routes/imageUploadRoutes');
const videouploadRoutes = require('./Routes/videouploadRoutes');
const roleRoutes = require('./Routes/Role')
const paymentRoutes = require('./Routes/paymentRoutes');

require('dotenv').config();
require('./db');

app.use(bodyParser.json());
const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];
app.use(
    cors({
        origin: function (origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
    })
);
app.use(cookieParser());

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/movie', movieRoutes);
app.use('/image', imageuploadRoutes);
app.use('/video', videouploadRoutes);
app.use('/role',roleRoutes);
app.use('/payment', paymentRoutes);

// Chapa Payment Initialization Route
app.post('/api/initialize-payment', async (req, res) => {
    try {
        console.log('Request Payload:', req.body);
        const response = await axios.post(
            'https://api.chapa.co/v1/transaction/initialize',
            {
                amount: req.body.amount,
                currency: 'ETB',
                email: req.body.email,
                first_name: req.body.firstName,
                last_name: req.body.lastName,
                tx_ref: req.body.tx_ref,
                return_url: req.body.return_url,
                callback_url: req.body.callback_url,
                customization: {
                    title: "Let us do this",
                    description: "Paying with Confidence with Chapa",
                    logo: "https://chapa.link/asset/images/chapa_swirl.svg"
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.PUBLIC_KEY}`
                }
            }
        );

        res.json(response.data);
    } catch (err) {
        console.error('Chapa API Error:', err.response?.data || err.message);
        res.status(500).json({ error: err.response?.data || 'Internal server error' });
    }
});

// Chapa Callback Route
app.post('/callback', (req, res) => {
    console.log('Chapa Callback:', req.body);
    // Verify payment status and update booking
    res.status(200).send('Callback received');
});

app.get('/', (req, res) => {
    res.json({ message: 'The API is working' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

