const Reservation = require("../models/Reservation");
const Restaurant = require("../models/Restaurant");

// @desc    Get all reservations
// @route   GET /api/v1/reservations
// @access  Private
exports.getReservations = async (req, res, next) => {
  let query;

  if (req.user.role !== "admin") {
    if (req.params.hospitalId) {
      // 1.1 ถ้ามีการระบุรพ. -> หาคิวของตัวเอง เฉพาะใน รพ. นั้น
      query = Reservation.find({
        user: req.user.id,
        hospital: req.params.hospitalId,
      }).populate({
        path: "hospital",
        select: "name province tel",
      });
    } else {
      // 1.2 ถ้าไม่ได้ระบุรพ. -> ดึงคิวทั้งหมดของตัวเอง
      query = Reservation.find({ user: req.user.id }).populate({
        path: "hospital",
        select: "name province tel",
      });
    }
  }
  // 🟢 2. ถ้าเป็น Admin (ดูได้หมด)
  else {
    if (req.params.hospitalId) {
      // 2.1 ถ้ามีการระบุรพ. -> ดึงคิวทั้งหมด เฉพาะใน รพ. นั้น
      query = Reservation.find({ hospital: req.params.hospitalId }).populate({
        path: "hospital",
        select: "name province tel",
      });
    } else {
      // 2.2 ถ้าไม่ได้ระบุรพ. -> ดึงคิวทั้งหมดในระบบ
      query = Reservation.find().populate({
        path: "hospital",
        select: "name province tel",
      });
    }
  }

  try {
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
      path: "hospital",
      select: "name province tel",
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
// @route   POST /api/v1/hospitals/:hospitalId/reservations
// @access  Private
exports.addReservation = async (req, res, next) => {
  try {
    req.body.restaurant = req.params.restaurantId;
    const restaurant = await Restaurant.findById(req.params.restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found with ID: " + req.params.restaurantId,
      });
    }

    // Add user to req.body
    req.body.user = req.user.id;

    const exitedReservation = await Reservation.find({ user: req.user.id });
    // If the user is not an admin, they can only create 3 reservations
    if (exitedReservation.length >= 3 && req.user.role !== "admin") {
      return res.status(400).json({
        success: false,
        message:
          "The user with ID " +
          req.user.id +
          " has already created 3 reservations",
      });
    }

    const reservation = await Reservation.create(req.body);
    res.status(200).json({ success: true, data: reservation });
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
    let reservation = await Reservation.findByIdAndUpdate(req.params.id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "No reservation found with ID: " + req.params.id,
      });
    }

    // Make sure user is reservation owner or admin
    if (
      reservation.user.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(401).json({
        success: false,
        message:
          "User " +
          req.user.id +
          " is not authorized to update this reservation",
      });
    }

    reservation = await Reservation.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: reservation });
  } catch (err) {
    console.error(err);

    return res
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
      return res.status(404).json({
        success: false,
        message: "No reservation found with ID: " + req.params.id,
      });
    }
    // Make sure user is reservation owner or admin
    if (
      reservation.user.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(401).json({
        success: false,
        message:
          "User " +
          req.user.id +
          " is not authorized to delete this reservation",
      });
    }
    await reservation.deleteOne({ _id: req.params.id });

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    console.error(err);

    return res
      .status(500)
      .json({ success: false, error: "Cannot delete reservation" });
  }
};
