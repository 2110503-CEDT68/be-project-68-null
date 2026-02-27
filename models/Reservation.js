const mongoose = require("mongoose");

const ReservationSchema = new mongoose.Schema({
  reservationDate: {
    type: Date,
    required: [true, "Please add a reservation date"],
  },
  tableCount: {
    type: Number,
    required: [true, "Please specify the number of tables"],
    min: [1, "You must reserve at least 1 table"],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
  restaurant: {
    type: mongoose.Schema.ObjectId,
    ref: "Restaurant", 
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Reservation", ReservationSchema);
