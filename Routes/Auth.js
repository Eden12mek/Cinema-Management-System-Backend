const express = require("express");
const router = express.Router();
const User = require("../Models/UserSchema");
const errorHandler = require("../Middlewares/errorMiddleware");
const authTokenHandler = require("../Middlewares/checkAuthToken");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

router.get("/test", async (req, res) => {
  res.json({
    message: "Auth api is working",
  });
});

function createResponse(ok, message, data) {
  return {
    ok,
    message,
    data,
  };
}

// Add this to your auth.js routes
router.get('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json(createResponse(false, 'No refresh token provided'));
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET_KEY);
    const user = await User.findOne({ _id: decoded.userId });

    if (!user || user.isActive === false) {
      return res.status(401).json(createResponse(false, 'Invalid refresh token'));
    }

    const newAuthToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET_KEY,
      { expiresIn: '10m' }
    );

    res.cookie('authToken', newAuthToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
    });

    res.json(createResponse(true, 'Token refreshed'));
  } catch (error) {
    res.status(401).json(createResponse(false, 'Invalid refresh token'));
  }
});

router.post("/register", async (req, res, next) => {
  try {
    const { firstName, lastName, email, password,phoneNumber, city } = req.body;
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      return res
        .status(409)
        .json(createResponse(false, "Email already exists"));
    }

    const newUser = new User({
      firstName,
      lastName,
      password,
      email,
      phoneNumber,
      city,
    });

    await newUser.save(); // Await the save operation
    res.status(201).json(createResponse(true, "User registered successfully"));
  } catch (err) {
    next(err);
  }
});

// change user city
router.post("/changeCity", authTokenHandler, async (req, res, next) => {
  const { city } = req.body;
  const user = await User.findOne({ _id: req.userId });

  if (!user) {
    return res.status(400).json(createResponse(false, "Invalid credentials"));
  } else {
    user.city = city;
    await user.save();
    return res
      .status(200)
      .json(createResponse(true, "City changed successfully"));
  }
});

// router.post('/sendotp', async (req, res) => {})
router.post("/login", async (req, res, next) => {
  console.log(req.body);
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    console.log("user not found");
    return res.status(400).json(createResponse(false, "Invalid credentials"));
  }

  if (user.isActive === false) {
    console.log("user is deactivated");
    return res
      .status(403)
      .json(
        createResponse(
          false,
          "Your account has been deactivated. Please contact support."
        )
      );
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    console.log("password not matched");
    return res.status(400).json(createResponse(false, "Invalid credentials"));
  }

  const authToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: "10m",
  });
  const refreshToken = jwt.sign(
    { userId: user._id },
    process.env.JWT_REFRESH_SECRET_KEY,
    { expiresIn: "30m" }
  );
  res.cookie("authToken", authToken, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  });

  res.status(200).json(
    createResponse(true, "Login successful", {
      authToken,
      refreshToken,
    })
  );
});

router.get('/checklogin', authTokenHandler, async (req, res) => {
  const user = await User.findOne({ _id: req.userId });

  if (!user || user.isActive === false) {
      return res.status(400).json(createResponse(false, 'Invalid credentials or account deactivated'));
  }
  
  res.json({
      userId: req.userId,
      ok: true,
      message: 'User authenticated successfully'
  });
});


router.get("/logout", authTokenHandler, async (req, res) => {
  res.clearCookie("authToken");
  res.clearCookie("refreshToken");
  res.json({
    ok: true,
    message: "User logged out successfully",
  });
});

router.get("/getuser", authTokenHandler, async (req, res) => {
  const user = await User.findOne({ _id: req.userId });

  if (!user) {
    return res.status(400).json(createResponse(false, "Invalid credentials"));
  } else {
    return res.status(200).json(createResponse(true, "User found", user));
  }
});

router.use(errorHandler);

module.exports = router;
