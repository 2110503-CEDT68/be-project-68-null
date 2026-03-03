const Reservation = require("../models/Reservation");
const Restaurant = require("../models/Restaurant");

// Constants
const MEAL_DURATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

// Helper: Check Table Availability (Overlap Check)
const checkTableAvailability = async (
  restaurantId,
  dateString,
  reqTableCount,
  excludeId = null,
) => {
  const requestedDate = new Date(dateString);
  const timeLowerBound = new Date(requestedDate.getTime() - MEAL_DURATION);
  const timeUpperBound = new Date(requestedDate.getTime() + MEAL_DURATION);

  const restaurant = await Restaurant.findById(restaurantId);

  const query = {
    restaurant: restaurantId,
    reservationDate: { $gt: timeLowerBound, $lt: timeUpperBound },
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const existingReservations = await Reservation.find(query);
  const reservedTables = existingReservations.reduce(
    (sum, resrv) => sum + resrv.tableCount,
    0,
  );

  const availableCount = Math.max(restaurant.totalTables - reservedTables, 0);

  return {
    isAvailable: reqTableCount <= availableCount,
    availableCount,
  };
};

// Helper: Get Current Bangkok Time
const getBangkokTime = () => {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
};

// Helper: Check if Date is in the Past
const checkPastDate = (dateString) => {
  const requestedDate = new Date(dateString);
  const nowInBangkok = getBangkokTime();
  
  return {
    isPast: requestedDate < nowInBangkok,
    message: "Cannot reserve in the past",
  };
};

// Helper: Check Authorization
const checkAuthorization = (reservation, userId, userRole) => {
  if (
    reservation.user.toString() !== userId &&
    userRole !== "admin"
  ) {
    return {
      isAuthorized: false,
      message: "Not authorized",
    };
  }
  return { isAuthorized: true };
};

// Helper: Check Daily Reservation Limit
const checkDailyReservationLimit = async (userId, dateString, userRole) => {
  const requestedDate = new Date(dateString);
  
  const bangkokDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(requestedDate);

  const [year, month, day] = bangkokDateStr.split("-");
  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  
  const sameDateReservations = await Reservation.find({
    user: userId,
    reservationDate: { $gte: startOfDay, $lte: endOfDay },
  });
  
  const isLimitExceeded = sameDateReservations.length >= 3 && userRole !== "admin";
  
  return {
    isLimitExceeded,
    count: sameDateReservations.length,
    message: isLimitExceeded ? `User ${userId} has already created 3 reservations on this date` : null,
  };
};

// Helper: Check Opening Hours
const checkOpeningHours = (restaurant, dateString) => {
  const requestedDate = new Date(dateString);

  // 1. บังคับอ่าน "วัน" ตามโซนเวลาประเทศไทยเสมอ
  const dayOfWeek = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    weekday: "long",
  }).format(requestedDate);

  // 2. บังคับอ่าน "เวลา HH:mm" ตามโซนเวลาประเทศไทยเสมอ
  const hourMinute = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23", // ใช้ h23 เพื่อให้รูปแบบเวลาเป็น 00-23 เสมอ (ป้องกันบั๊ก 24:00)
  }).format(requestedDate);

  const openingInfo = restaurant.openingHours.find((d) => d.day === dayOfWeek); // loop opening day

  if (!openingInfo || openingInfo.closed) {
    return { isOpen: false, message: `Closed on ${dayOfWeek}` };
  }

  // เปรียบเทียบ string "HH:mm"
  if (hourMinute < openingInfo.open || hourMinute >= openingInfo.close) {
    return {
      isOpen: false,
      message: `Open from ${openingInfo.open} to ${openingInfo.close}`,
    };
  }

  return { isOpen: true };
};

// @desc    Get all reservations
// @route   GET /api/v1/reservations or GET /api/v1/restaurants/:restaurantId/reservations
// @access  Private
exports.getReservations = async (req, res, next) => {
  try {
    let query;

    // Admin sees all, only their own
    if (req.user.role !== "admin") {
      if (req.params.restaurantId) {    // if restaurantId param exists, filter by restaurant and user
        query = Reservation.find({
          user: req.user.id,
          restaurant: req.params.restaurantId,
        }).populate({ path: "restaurant", select: "name address tel" });
      } else {        // show all resevations of the user
        query = Reservation.find({ user: req.user.id }).populate({
          path: "restaurant",
          select: "name address tel",
        });
      }
    } else {        // if admin
      if (req.params.restaurantId) {      // show all resevations of the restaurant by restaurantId param
        query = Reservation.find({
          restaurant: req.params.restaurantId,
        }).populate({ path: "restaurant", select: "name address tel" });
      } else {        // 
        query = Reservation.find().populate({
          path: "restaurant",
          select: "name address tel",
        });
      }
    }

    const reservations = await query;       // execute query and get reservations
    res.status(200).json({
      success: true,
      count: reservations.length,
      data: reservations,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Cannot find reservations" });
  }
};

// @desc    Get single reservation
// @route   GET /api/v1/reservations/:id
// @access  Public
exports.getReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate({
      path: "restaurant",
      select: "name address tel",
    });

    if (!reservation) {     // reservation not found
      return res
        .status(404)
        .json({ success: false, message: "Reservation not found" });
    }
    res.status(200).json({ success: true, data: reservation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Cannot find reservation" });
  }
};

// @desc    Add reservation
// @route   POST /api/v1/restaurants/:restaurantId/reservations
// @access  Private
exports.addReservation = async (req, res, next) => {
  try {
    req.body.restaurant = req.params.restaurantId; // set restaurant from URL param
    req.body.user = req.user.id;  // set user from authenticated user

    // 1. Check restaurant existence
    const restaurant = await Restaurant.findById(req.params.restaurantId);
    if (!restaurant) {  // restaurant not found
      return res
        .status(404)
        .json({ success: false, message: "Restaurant not found" });
    }

    // 2. Check if reservation date is in the past (GMT+7 timezone)
    const requestedDate = new Date(req.body.reservationDate);
    const pastCheck = checkPastDate(req.body.reservationDate);
    if (pastCheck.isPast) {
      return res.status(400).json({
        success: false,
        message: pastCheck.message,
      });
    }

    // 3. Check 3-reservations-per-day limit (GMT+7 timezone)
    const dailyLimit = await checkDailyReservationLimit(
      req.user.id,
      req.body.reservationDate,
      req.user.role
    );
    
    if (dailyLimit.isLimitExceeded) {
      return res.status(400).json({
        success: false,
        message: dailyLimit.message,
      });
    }

    // 4. Check opening hours
    const storeStatus = checkOpeningHours(restaurant, req.body.reservationDate);
    if (!storeStatus.isOpen) {
      return res
        .status(400)
        .json({ success: false, message: storeStatus.message });
    }

    // 5. Check capacity & time overlap
    const capacity = await checkTableAvailability(
      req.params.restaurantId,
      req.body.reservationDate,
      req.body.tableCount,
    );

    if (!capacity.isAvailable) {      // not enough tables available at the requested time
      return res.status(400).json({
        success: false,
        message: `Not enough tables. Only ${capacity.availableCount} left.`,
      });
    }

    // 6. Calculate and set endTime
    req.body.endTime = new Date(requestedDate.getTime() + MEAL_DURATION);

    // 7. Create reservation
    const reservation = await Reservation.create(req.body);
    res.status(201).json({ success: true, data: reservation });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, error: "Cannot create reservation" });
  }
};

// @desc    Update reservation
// @route   PUT /api/v1/reservations/:id
// @access  Private
exports.updateReservation = async (req, res, next) => {
  try {
    let reservation = await Reservation.findById(req.params.id);

    if (!reservation) { // reservation not found
      return res
        .status(404)
        .json({ success: false, message: "Reservation not found" });
    }

    // Authorization check
    const authCheck = checkAuthorization(reservation, req.user.id, req.user.role);
    if (!authCheck.isAuthorized) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized to update" });
    }

    // Capacity & Opening Hours Check for Update
    if (req.body.reservationDate || req.body.tableCount) {
      const newDate = req.body.reservationDate || reservation.reservationDate;
      const newTableCount = req.body.tableCount || reservation.tableCount;

      const restaurant = await Restaurant.findById(reservation.restaurant);
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: "Restaurant for this reservation not found",
        });
      }

      if (req.body.reservationDate) {
        // Check if new date is in the past (GMT+7)
        const pastCheck = checkPastDate(newDate);
        if (pastCheck.isPast) {
          return res.status(400).json({
            success: false,
            message: "Cannot update to a past date",
          });
        }

        // Check 3-reservations-per-day limit for the new date
        const dailyLimit = await checkDailyReservationLimit(
          req.user.id,
          newDate,
          req.user.role
        );
        
        if (dailyLimit.isLimitExceeded) {
          return res.status(400).json({
            success: false,
            message: dailyLimit.message,
          });
        }

        const storeStatus = checkOpeningHours(restaurant, newDate);
        if (!storeStatus.isOpen) {
          return res
            .status(400)
            .json({ success: false, message: storeStatus.message });
        }
      }

      const capacity = await checkTableAvailability(
        reservation.restaurant,
        newDate,
        newTableCount,
        req.params.id,
      );

      if (!capacity.isAvailable) {
        return res.status(400).json({
          success: false,
          message: `Update failed. Only ${capacity.availableCount} tables available at that time.`,
        });
      }

      if (req.body.reservationDate) {
        req.body.endTime = new Date(
          new Date(newDate).getTime() + MEAL_DURATION,
        );
      }
    }

    // Update the document
    reservation = await Reservation.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: reservation });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, error: "Cannot update reservation" });
  }
};

// @desc    Delete reservation
// @route   DELETE /api/v1/reservations/:id
// @access  Private
exports.deleteReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res
        .status(404)
        .json({ success: false, message: "Reservation not found" });
    }

    // Authorization check
    const authCheck = checkAuthorization(reservation, req.user.id, req.user.role);
    if (!authCheck.isAuthorized) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized to delete" });
    }

    await reservation.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, error: "Cannot delete reservation" });
  }
};
