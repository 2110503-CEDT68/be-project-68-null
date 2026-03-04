const express = require("express");
const {
  getReservations,
  getReservation,
  addReservation,
  updateReservation,
  deleteReservation,
} = require("../controllers/reservation");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router({mergeParams:true});

router
  .route("/")
  .get(protect, getReservations)  // only authenticated users can view reservations
  .post(protect, authorize("admin", "user"), addReservation); // only admin and regular users can create reservations

router
  .route("/:id")
  .get(protect, getReservation) // only authenticated users can view a specific reservation
  .put(protect, authorize("admin", "user"), updateReservation)  // only admin and regular users can update reservations
  .delete(protect, authorize("admin", "user"), deleteReservation);  // only admin and regular users can delete reservations

module.exports = router;
