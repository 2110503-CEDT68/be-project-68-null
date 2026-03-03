const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const {
  getRestaurantMenus,
  getRestaurantMenu,
  createRestaurantMenu,
  updateRestaurantMenu,
  deleteRestaurantMenu,
} = require("../controllers/restaurantMenu.js");

const router = express.Router({ mergeParams: true });

router
  .route("/")
  .get(getRestaurantMenus)
  .post(protect, authorize("admin"), createRestaurantMenu);

router
  .route("/:id")
  .get(getRestaurantMenu)
  .put(protect, authorize("admin"), updateRestaurantMenu)
  .delete(protect, authorize("admin"), deleteRestaurantMenu);

module.exports = router;
