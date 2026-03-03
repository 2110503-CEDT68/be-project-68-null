const mongoose = require("mongoose");

const restaurantMenuSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
    required: true,
  },
  items: [
    {
      name: {
        type: String,
        required: [true, "Please add a menu item name"],        //consisting of references to related restaurants and menu items in array format.
      },
      description: {
        type: String,
        required: [true, "Please add a menu item description"], //Each menu item has a name, description, and price, all of which are required fields with custom error messages if they are not provided.
      },
      price: {
        type: Number,
        required: [true, "Please add a menu item price"],       //The price field is of type Number and is also required, with a custom error message if it is not provided.
      },
    },
  ],
});

module.exports = mongoose.model("RestaurantMenu", restaurantMenuSchema);
