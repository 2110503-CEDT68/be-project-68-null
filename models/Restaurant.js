const mongoose = require("mongoose");

const RestaurantSchema = new mongoose.Schema({
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
                    required: true
                },
                open: {
                    type: String // e.g. '09:00'
                },
                close: {
                    type: String // e.g. '18:00'
                },
                closed: {
                    type: Boolean,
                    default: false
                }
            }
        ],
        required: true
    }
});

module.exports = mongoose.model("Restaurant", RestaurantSchema);
