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

const router = express.Router();

router.use("/:restaurantId/reservations", reservationRouter);

router.route("/")
  .get(getRestaurants) // Public 
  .post(protect, authorize("admin"), createRestaurant);

router
  .route("/:id")
  .get(getRestaurant)
  .put(protect, authorize("admin"), updateRestaurant)
  .delete(protect, authorize("admin"), deleteRestaurant);

module.exports = router;
