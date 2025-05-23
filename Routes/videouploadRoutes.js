const express = require('express');
const router = express.Router();
require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

const sharp = require('sharp');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();

const upload = multer({ storage });


router.post('/uploadvideo', upload.single('myvideo'), async (req, res) => {
    const file = req.file;
    if (!file) {
        return res.status(400).json({ ok: false, error: 'No video file provided' });
    }

    cloudinary.uploader.upload_stream({ 
        resource_type: 'video' // Specify that it's a video upload
    }, async (error, result) => {
        if (error) {
            console.error('Cloudinary Upload Error:', error);
            return res.status(500).json({ ok: false, error: 'Error uploading video to Cloudinary' });
        }

        res.json({ ok: true, videoUrl: result.secure_url, message: 'Video uploaded successfully' });
    }).end(file.buffer);
});

module.exports = router;