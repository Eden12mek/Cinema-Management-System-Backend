const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();


const User = require('../Models/UserSchema')
const Movie = require('../Models/MovieSchema')
const Booking = require('../Models/BookingSchema')
const Screen = require('../Models/ScreenSchema')


const errorHandler = require('../Middlewares/errorMiddleware');
const authTokenHandler = require('../Middlewares/checkAuthToken');
const adminTokenHandler = require('../Middlewares/checkAdminToken');


function createResponse(ok, message, data) {
    return {
        ok,
        message,
        data,
    };
}

router.get('/test', async (req, res) => {
    res.json({
        message: "Movie api is working"
    })
})


// admin access
router.post('/createmovie', adminTokenHandler, async (req, res, next) => {
    try {
        const { title, description, portraitImgUrl, landscapeImgUrl, rating, genre, duration, trailerVideoUrl } = req.body;

        const newMovie = new Movie({ title, description, portraitImgUrl, landscapeImgUrl, rating, genre, duration, trailerVideoUrl })
        await newMovie.save();
        res.status(201).json({
            ok: true,
            message: "Movie added successfully"
        });
    }
    catch (err) {
        next(err); // Pass any errors to the error handling middleware
    }
})
router.post('/addcelebtomovie', adminTokenHandler, async (req, res, next) => {
    try {
        const { movieId, celebType, celebName, celebRole, celebImage } = req.body;
        const movie = await Movie.findById(movieId);
        if (!movie) {
            return res.status(404).json({
                ok: false,
                message: "Movie not found"
            });
        }
        const newCeleb = {
            celebType,
            celebName,
            celebRole,
            celebImage
        };
        if (celebType === "cast") {
            movie.cast.push(newCeleb);
        } else {
            movie.crew.push(newCeleb);
        }
        await movie.save();

        res.status(201).json({
            ok: true,
            message: "Celeb added successfully"
        });
    }
    catch (err) {
        next(err); // Pass any errors to the error handling middleware
    }
})
router.post('/createscreen', adminTokenHandler, async (req, res, next) => {
    try {
        const { name, location, seats, city, screenType } = req.body;
        const newScreen = new Screen({
            name,
            location,
            seats,
            city: city.toLowerCase(),
            screenType,
            movieSchedules: []
        });

        await newScreen.save();


        res.status(201).json({
            ok: true,
            message: "Screen added successfully"
        });
    }
    catch (err) {
        console.log(err);
        next(err); // Pass any errors to the error handling middleware
    }
})

router.get('/screens', async (req, res, next) => {
    try {
        const screens = await Screen.find(); // Exclude heavy fields for listing
        
        // Return the list of movies as JSON response
        res.status(200).json({
            ok: true,
            data: screens,
            message: 'Screens retrieved successfully'
        });
    }
    catch (err) {
        next(err);
    }
})
router.post('/addmoviescheduletoscreen', adminTokenHandler, async (req, res, next) => {
    console.log("Inside addmoviescheduletoscreen")
    try {
        const { screenId, movieId, showTime, showDate } = req.body;
        const screen = await Screen.findById(screenId);
        if (!screen) {
            return res.status(404).json({
                ok: false,
                message: "Screen not found"
            });
        }

        const movie = await Movie.findById(movieId);
        if (!movie) {
            return res.status(404).json({
                ok: false,
                message: "Movie not found"
            });
        }

        screen.movieSchedules.push({
            movieId,
            showTime,
            notavailableseats: [],
            showDate
        });

        await screen.save();

        res.status(201).json({
            ok: true,
            message: "Movie schedule added successfully"
        });

    }
    catch (err) {
        next(err); // Pass any errors to the error handling middleware
    }
})


// user access
router.post('/bookticket', authTokenHandler, async (req, res, next) => {
    try {
        const { showTime, showDate, movieId, screenId, seats, totalPrice, paymentId, paymentType } = req.body;
        console.log(req.body);

        // You can create a function to verify payment id

        const screen = await Screen.findById(screenId);

        if (!screen) {
            return res.status(404).json({
                ok: false,
                message: "Theatre not found"
            });
        }



        const movieSchedule = screen.movieSchedules.find(schedule => {
            console.log(schedule);
            let showDate1 = new Date(schedule.showDate);
            let showDate2 = new Date(showDate);
            if (showDate1.getDay() === showDate2.getDay() &&
                showDate1.getMonth() === showDate2.getMonth() &&
                showDate1.getFullYear() === showDate2.getFullYear() &&
                schedule.showTime === showTime &&
                schedule.movieId == movieId) {
                return true;
            }
            return false;
        });

        if (!movieSchedule) {
            return res.status(404).json({
                ok: false,
                message: "Movie schedule not found"
            });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({
                ok: false,
                message: "User not found"
            });
        }
        console.log('before newBooking done');
        const newBooking = new Booking({ userId: req.userId, showTime, showDate, movieId, screenId, seats, totalPrice, paymentId, paymentType })
        await newBooking.save();
        console.log('newBooking done');



        movieSchedule.notAvailableSeats.push(...seats);
        await screen.save();
        console.log('screen saved');

        user.bookings.push(newBooking._id);
        await user.save();
        console.log('user saved');
        res.status(201).json({
            ok: true,
            message: "Booking successful"
        });
// After successful booking, update user's total spent
    await User.findByIdAndUpdate(req.userId, {
      $inc: { totalSpent: totalPrice },
      lastBookingDate: new Date()
    });
    }
    catch (err) {
        next(err); // Pass any errors to the error handling middleware
    }
})
router.get('/movies', async (req, res, next) => {
    try {
        const movies = await Movie.find().select('-cast -crew'); // Exclude heavy fields for listing
        
        // Return the list of movies as JSON response
        res.status(200).json({
            ok: true,
            data: movies,
            message: 'Movies retrieved successfully'
        });
    }
    catch (err) {
        next(err);
    }
})

// router.get('/movies', async (req, res, next) => {
//     try {
//         const movies = await Movie.find();

//         // Return the list of movies as JSON response
//         res.status(200).json({
//             ok: true,
//             data: movies,
//             message: 'Movies retrieved successfully'
//         });
//     }
//     catch (err) {
//         next(err); // Pass any errors to the error handling middleware
//     }
// })
router.get('/movies/:id', async (req, res, next) => {
    try {
        const movieId = req.params.id;
        const movie = await Movie.findById(movieId);
        if (!movie) {
            // If the movie is not found, return a 404 Not Found response
            return res.status(404).json({
                ok: false,
                message: 'Movie not found'
            });
        }

        res.status(200).json({
            ok: true,
            data: movie,
            message: 'Movie retrieved successfully'
        });
    }
    catch (err) {
        next(err); // Pass any errors to the error handling middleware
    }
})
router.get('/screensbycity/:city', async (req, res, next) => {
    const city = req.params.city.toLowerCase();

    try {
        const screens = await Screen.find({ city });
        if (!screens || screens.length === 0) {
            return res.status(404).json(createResponse(false, 'No screens found in the specified city', null));
        }

        res.status(200).json(createResponse(true, 'Screens retrieved successfully', screens));
    }
    catch (err) {
        next(err); // Pass any errors to the error handling middleware
    }
});
router.get('/screensbymovieschedule/:city/:date/:movieid', async (req, res, next) => {
    try {
        const city = req.params.city.toLowerCase();
        const date = req.params.date;
        const movieId = req.params.movieid;

        // Retrieve screens for the specified city
        const screens = await Screen.find({ city });

        // Check if screens were found
        if (!screens || screens.length === 0) {
            return res.status(404).json(createResponse(false, 'No screens found in the specified city', null));
        }

        // Filter screens based on the movieId
        // const filteredScreens = screens.filter(screen =>
        //     screen.movieSchedules.some(schedule => schedule.movieId == movieId)
        // );


        let temp = []
        // Filter screens based on the showDate
        const filteredScreens = screens.forEach(screen => {
            // screen 

            screen.movieSchedules.forEach(schedule => {
                let showDate = new Date(schedule.showDate);
                let bodyDate = new Date(date);
                // console.log(showDate , bodyDate);
                if (showDate.getDay() === bodyDate.getDay() &&
                    showDate.getMonth() === bodyDate.getMonth() &&
                    showDate.getFullYear() === bodyDate.getFullYear() &&
                    schedule.movieId == movieId) {
                    temp.push(
                        screen
                    );
                }
            })
        }
        );

        console.log(temp);

        res.status(200).json(createResponse(true, 'Screens retrieved successfully', temp));

    } catch (err) {
        next(err); // Pass any errors to the error handling middleware
    }
});

router.get('/schedulebymovie/:screenid/:date/:movieid', async (req, res, next) => {
    const screenId = req.params.screenid;
    const date = req.params.date;
    const movieId = req.params.movieid;

    const screen = await Screen.findById(screenId);

    if (!screen) {
        return res.status(404).json(createResponse(false, 'Screen not found', null));
    }

    const movieSchedules = screen.movieSchedules.filter(schedule => {
        let showDate = new Date(schedule.showDate);
        let bodyDate = new Date(date);
        if (showDate.getDay() === bodyDate.getDay() &&
            showDate.getMonth() === bodyDate.getMonth() &&
            showDate.getFullYear() === bodyDate.getFullYear() &&
            schedule.movieId == movieId) {
            return true;
        }
        return false;
    });
    console.log(movieSchedules)

    if (!movieSchedules) {
        return res.status(404).json(createResponse(false, 'Movie schedule not found', null));
    }

    res.status(200).json(createResponse(true, 'Movie schedule retrieved successfully', {
        screen,
        movieSchedulesforDate: movieSchedules
    }));

});


router.get('/getuserbookings' , authTokenHandler , async (req , res , next) => {
    try {
        const user = await User.findById(req.userId).populate('bookings');
        if(!user){
            return res.status(404).json(createResponse(false, 'User not found', null));
        }

        let bookings = [];
        // user.bookings.forEach(async booking => {
        //     let bookingobj = await Booking.findById(booking._id);
        //     bookings.push(bookingobj);
        // })

        for(let i = 0 ; i < user.bookings.length ; i++){
            let bookingobj = await Booking.findById(user.bookings[i]._id);
            bookings.push(bookingobj);
        }

        res.status(200).json(createResponse(true, 'User bookings retrieved successfully', bookings));
        // res.status(200).json(createResponse(true, 'User bookings retrieved successfully', user.bookings));
    } catch (err) {
        next(err); // Pass any errors to the error handling middleware
    }
})

router.get('/getuserbookings/:id' , authTokenHandler , async (req , res , next) => {
    try {
        const bookingId = req.params.id;
        const booking = await Booking.findById(bookingId);

        if(!booking){
            return res.status(404).json(createResponse(false, 'Booking not found', null));
        }

        res.status(200).json(createResponse(true, 'Booking retrieved successfully', booking));
    } catch (err) {
        next(err); // Pass any errors to the error handling middleware
    }
})

// Backend: Sample Payment Route (Node.js / Express)

router.post('/payment/create', async (req, res) => {
    const { bookingId, totalPrice } = req.body;

    try {
        // Call Chapa API to create a payment session
        const response = await axios.post('https://api.chapa.co/v1/transaction/initialize', {
            amount: totalPrice,
            bookingId,
            currency: 'ETB',
            return_url: `${process.env.FRONTEND_URL}/payment/success`,
            cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
        });

        if (response.data.success) {
            res.json({ paymentUrl: response.data.payment_url });
        } else {
            res.status(500).json({ error: 'Failed to create payment session' });
        }
    } catch (error) {
        console.error('Chapa Payment Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.put('/updatemovie/:id', adminTokenHandler, async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Prevent updating certain fields
        const disallowedUpdates = ['_id', 'createdAt', 'updatedAt'];
        Object.keys(updates).forEach(key => {
            if (disallowedUpdates.includes(key)) {
                delete updates[key];
            }
        });

        const updatedMovie = await Movie.findByIdAndUpdate(
            id,
            updates,
            { new: true, runValidators: true }
        );

        if (!updatedMovie) {
            return res.status(404).json({
                ok: false,
                message: "Movie not found"
            });
        }

        res.status(200).json({
            ok: true,
            message: "Movie updated successfully",
            data: updatedMovie
        });
    }
    catch (err) {
        next(err);
    }
});

router.put('/updatescreen/:id', adminTokenHandler, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, location, city, screenType } = req.body;

        // Don't allow updating seats directly through this route
        const updatedScreen = await Screen.findByIdAndUpdate(
            id,
            { name, location, city, screenType },
            { new: true, runValidators: true }
        );

        if (!updatedScreen) {
            return res.status(404).json({
                ok: false,
                message: "Screen not found"
            });
        }

        res.status(200).json({
            ok: true,
            message: "Screen updated successfully",
            data: updatedScreen
        });
    }
    catch (err) {
        next(err);
    }
});


router.put('/updateschedule/:screenId/:scheduleId', adminTokenHandler, async (req, res, next) => {
    try {
        const { screenId, scheduleId } = req.params;
        const { showTime, showDate } = req.body;

        const screen = await Screen.findById(screenId);
        if (!screen) {
            return res.status(404).json({
                ok: false,
                message: "Screen not found"
            });
        }

        const schedule = screen.movieSchedules.id(scheduleId);
        if (!schedule) {
            return res.status(404).json({
                ok: false,
                message: "Schedule not found"
            });
        }

        // Check if there are bookings for this schedule
        const bookings = await Booking.find({ 
            screenId,
            showDate: schedule.showDate,
            showTime: schedule.showTime
        });

        if (bookings.length > 0) {
            return res.status(400).json({
                ok: false,
                message: "Cannot modify schedule with existing bookings"
            });
        }

        schedule.showTime = showTime || schedule.showTime;
        schedule.showDate = showDate || schedule.showDate;
        
        await screen.save();

        res.status(200).json({
            ok: true,
            message: "Schedule updated successfully",
            data: screen
        });
    }
    catch (err) {
        next(err);
    }
});


router.put('/updateseats/:screenId', adminTokenHandler, async (req, res, next) => {
    try {
        const { screenId } = req.params;
        const { seats } = req.body;

        // Check if there are any bookings for this screen
        const bookings = await Booking.find({ screenId });
        if (bookings.length > 0) {
            return res.status(400).json({
                ok: false,
                message: "Cannot update seat configuration with existing bookings"
            });
        }

        const updatedScreen = await Screen.findByIdAndUpdate(
            screenId,
            { seats },
            { new: true, runValidators: true }
        );

        if (!updatedScreen) {
            return res.status(404).json({
                ok: false,
                message: "Screen not found"
            });
        }

        res.status(200).json({
            ok: true,
            message: "Seat configuration updated successfully",
            data: updatedScreen
        });
    }
    catch (err) {
        next(err);
    }
});



router.delete('/deletemovie/:id', adminTokenHandler, async (req, res, next) => {
    try {
        const { id } = req.params;

        // First, check if there are any bookings for this movie
        const bookings = await Booking.find({ movieId: id });
        if (bookings.length > 0) {
            return res.status(400).json({
                ok: false,
                message: "Cannot delete movie with existing bookings"
            });
        }

        const deletedMovie = await Movie.findByIdAndDelete(id);
        if (!deletedMovie) {
            return res.status(404).json({
                ok: false,
                message: "Movie not found"
            });
        }

        res.status(200).json({
            ok: true,
            message: "Movie deleted successfully"
        });
    }
    catch (err) {
        next(err);
    }
});

router.delete('/deletescreen/:id', adminTokenHandler, async (req, res, next) => {
    try {
        const { id } = req.params;

        // Validate the screen ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                ok: false,
                message: "Invalid screen ID format"
            });
        }

        // Check if there are any bookings for this screen
        const bookings = await Booking.find({ screenId: id });
        if (bookings.length > 0) {
            return res.status(400).json({
                ok: false,
                message: "Cannot delete screen with existing bookings. Please delete bookings first."
            });
        }

        // Check if screen exists and has scheduled movies
        const screen = await Screen.findById(id);
        if (!screen) {
            return res.status(404).json({
                ok: false,
                message: "Screen not found"
            });
        }

        if (screen.movieSchedules && screen.movieSchedules.length > 0) {
            return res.status(400).json({
                ok: false,
                message: "Cannot delete screen with scheduled movies. Please remove schedules first."
            });
        }

        // Delete the screen
        await Screen.findByIdAndDelete(id);

        res.status(200).json({
            ok: true,
            message: "Screen deleted successfully"
        });
    }
    catch (err) {
        console.error('Error deleting screen:', err);
        next(err);
    }
});

router.delete('/deleteschedule/:screenId/:scheduleId', adminTokenHandler, async (req, res, next) => {
    try {
        const { screenId, scheduleId } = req.params;

        const screen = await Screen.findById(screenId);
        if (!screen) {
            return res.status(404).json({
                ok: false,
                message: "Screen not found"
            });
        }

        // Check if there are bookings for this schedule
        const bookings = await Booking.find({ 
            screenId,
            showDate: screen.movieSchedules.id(scheduleId).showDate,
            showTime: screen.movieSchedules.id(scheduleId).showTime
        });

        if (bookings.length > 0) {
            return res.status(400).json({
                ok: false,
                message: "Cannot delete schedule with existing bookings"
            });
        }

        screen.movieSchedules.pull(scheduleId);
        await screen.save();

        res.status(200).json({
            ok: true,
            message: "Schedule deleted successfully"
        });
    }
    catch (err) {
        next(err);
    }
});

router.use(errorHandler)

module.exports = router;