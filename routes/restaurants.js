const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const {
  getRestaurants,
  getRestaurant,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
} = require("../controllers/restaurant");

const reservationRouter = require("./reservations");

const menuRouter = require("./restaurantMenu");

const router = express.Router({ mergeParams: true }); // allow child to access parent params

router.use("/:restaurantId/reservations", reservationRouter);
router.use("/:restaurantId/menus", menuRouter);

router
  .route("/")
  .get(getRestaurants)    // everyone can view the list of restaurants
  .post(protect, authorize("admin"), createRestaurant); // only admin can create a restaurant

router
  .route("/:id")
  .get(getRestaurant)  // everyone can view a specific restaurant
  .put(protect, authorize("admin"), updateRestaurant) // only admin can update a restaurant
  .delete(protect, authorize("admin"), deleteRestaurant); // only admin can delete a restaurant

module.exports = router;
