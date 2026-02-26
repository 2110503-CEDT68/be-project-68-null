const mongoose = require("mongoose");
const User = require("./User");
const { create } = require("./Restaurant");

const ReservationSchema = new mongoose.Schema({
    reservationDate: {
        type: Date,
        required: [true, "Please add a reservation date"]
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        required: true 
    },
    restaurant: {
        type: mongoose.Schema.ObjectId,
        ref: "Restaurant",
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Reservation", ReservationSchema);