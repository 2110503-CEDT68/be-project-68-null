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
  .get(getRestaurants)
  .post(protect, authorize("admin"), createRestaurant);

router
  .route("/:id")
  .get(getRestaurant)
  .put(protect, authorize("admin"), updateRestaurant)
  .delete(protect, authorize("admin"), deleteRestaurant);

module.exports = router;
