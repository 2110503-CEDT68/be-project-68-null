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

  return {
    isAvailable: reservedTables + reqTableCount <= restaurant.totalTables,
    availableCount: restaurant.totalTables - reservedTables,
  };
};

// Helper: Check Opening Hours
const checkOpeningHours = (restaurant, dateString) => {
  const requestedDate = new Date(dateString);
  const dayOfWeek = requestedDate.toLocaleString("en-US", { weekday: "long" });
  const hourMinute = requestedDate.toTimeString().slice(0, 5); // 'HH:MM'

  const openingInfo = restaurant.openingHours.find((d) => d.day === dayOfWeek);

  if (!openingInfo || openingInfo.closed) {
    return { isOpen: false, message: `Closed on ${dayOfWeek}` };
  }
  if (hourMinute < openingInfo.open || hourMinute >= openingInfo.close) {
    return {
      isOpen: false,
      message: `Open from ${openingInfo.open} to ${openingInfo.close}`,
    };
  }

  return { isOpen: true };
};

// @desc    Get all reservations
// @route   GET /api/v1/reservations
// @access  Private
exports.getReservations = async (req, res, next) => {
  try {
    let query;

    // Admin sees all, User sees only their own
    if (req.user.role !== "admin") {
      if (req.params.restaurantId) {
        query = Reservation.find({
          user: req.user.id,
          restaurant: req.params.restaurantId,
        }).populate({ path: "restaurant", select: "name address tel" });
      } else {
        query = Reservation.find({ user: req.user.id }).populate({
          path: "restaurant",
          select: "name address tel",
        });
      }
    } else {
      if (req.params.restaurantId) {
        query = Reservation.find({
          restaurant: req.params.restaurantId,
        }).populate({ path: "restaurant", select: "name address tel" });
      } else {
        query = Reservation.find().populate({
          path: "restaurant",
          select: "name address tel",
        });
      }
    }

    const reservations = await query;
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

    if (!reservation) {
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
    req.body.restaurant = req.params.restaurantId;
    req.body.user = req.user.id;

    // 1. Check restaurant existence
    const restaurant = await Restaurant.findById(req.params.restaurantId);
    if (!restaurant) {
      return res
        .status(404)
        .json({ success: false, message: "Restaurant not found" });
    }

    const requestedDate = new Date(req.body.reservationDate);

    // 2. Check 3-reservations-per-day limit
    const startOfDay = new Date(requestedDate).setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(requestedDate).setUTCHours(23, 59, 59, 999);

    const sameDateReservations = await Reservation.find({
      user: req.user.id,
      reservationDate: { $gte: startOfDay, $lte: endOfDay },
    });

    if (sameDateReservations.length >= 3 && req.user.role !== "admin") {
      return res.status(400).json({
        success: false,
        message: `User ${req.user.id} has already created 3 reservations on this date`,
      });
    }

    // 3. Check opening hours
    const storeStatus = checkOpeningHours(restaurant, req.body.reservationDate);
    if (!storeStatus.isOpen) {
      return res
        .status(400)
        .json({ success: false, message: storeStatus.message });
    }

    // 4. Check capacity & time overlap
    const capacity = await checkTableAvailability(
      req.params.restaurantId,
      req.body.reservationDate,
      req.body.tableCount,
    );

    if (!capacity.isAvailable) {
      return res.status(400).json({
        success: false,
        message: `Not enough tables. Only ${capacity.availableCount} left.`,
      });
    }

    // 5. Calculate and set endTime
    req.body.endTime = new Date(requestedDate.getTime() + MEAL_DURATION);

    // 6. Create reservation
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

    if (!reservation) {
      return res
        .status(404)
        .json({ success: false, message: "Reservation not found" });
    }

    // Authorization
    if (
      reservation.user.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized to update" });
    }

    // Capacity & Opening Hours Check for Update
    if (req.body.reservationDate || req.body.tableCount) {
      const newDate = req.body.reservationDate || reservation.reservationDate;
      const newTableCount = req.body.tableCount || reservation.tableCount;

      const restaurant = await Restaurant.findById(reservation.restaurant);

      if (req.body.reservationDate) {
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

    // Authorization
    if (
      reservation.user.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
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
