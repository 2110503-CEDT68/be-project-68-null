const mongoose = require("mongoose");

const RestaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a restaurant name"],
      unique: true,
      trim: true,
      maxlength: [50, "Name can not be more than 50 characters"],
    },
    address: {
      type: String,
      required: [true, "Please add an address"],
    },
    tel: {
      type: String,
      required: [true, "Please add a telephone number"],
    },
    openingHours: {
      type: [
        {
          day: {
            type: String, // e.g. 'Monday', 'Tuesday', ...
            enum: [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ],
            required: true,
          },
          open: {
            type: String, // e.g. '09:00'
            required: true,
          },
          close: {
            type: String, // e.g. '18:00'
            required: true,
          },
          closed: {
            type: Boolean,
            default: false,
          },
        },
      ],
    },
    totalTables: {
      type: Number,
      required: [true, "Please add total number of tables"]
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// (Optional) สร้าง Virtual Field เพื่อดึงข้อมูลการจองของร้านนี้มาแสดงได้ง่ายๆ
RestaurantSchema.virtual("reservations", {
  ref: "Reservation",
  localField: "_id",
  foreignField: "restaurant",
  justOne: false,
});

module.exports = mongoose.model("Restaurant", RestaurantSchema);
