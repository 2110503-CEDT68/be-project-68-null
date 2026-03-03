const Reservation = require("../models/Reservation");
const Restaurant = require("../models/Restaurant");
const RestaurantMenu = require("../models/RestaurantMenu");

// @desc    Get all restaurant menus
// @route   GET /api/v1/restaurants/:restaurantId/menus
// @access  Public
exports.getRestaurantMenus = async (req, res, next) => {
    try {
        const restaurantMenus = await RestaurantMenu.find({     //Search for restaurant menus with matching IDs.
          restaurant: req.params.restaurantId,                  //It returns data in JSON format containing success, count, and data.
        });                                                          
        res.status(200).json({
            success: true,
            count: restaurantMenus.length,
            data: restaurantMenus,
        });
    } catch (err) {
        console.error(err);
        res.status(400).json({ success: false, message: "Cannot get restaurant menus" });
    }
};

// @desc    Get single restaurant menu
// @route   GET /api/v1/restaurants/:restaurantId/menus/:id
// @access  Public
exports.getRestaurantMenu = async (req, res, next) => {
    try {
        const restaurantMenu = await RestaurantMenu.findOne({   //Search for a single restaurant menu with matching IDs.
            _id: req.params.id,                                 //It returns data in JSON format containing success and data.
            restaurant: req.params.restaurantId,
        });
        if (!restaurantMenu) {
            return res
                .status(404)
                .json({ success: false, message: "Restaurant menu not found" });
        }
        res.status(200).json({ success: true, data: restaurantMenu });
    } catch (err) {
        console.error(err);
        res.status(400).json({ success: false, message: "Cannot get restaurant menu" });
    }
};

// @desc    Create new restaurant menu
// @route   POST /api/v1/restaurants/:restaurantId/menus
// @access  Private
exports.createRestaurantMenu = async (req, res, next) => {
    try {
        const restaurant = await Restaurant.findById(req.params.restaurantId);  //Search for a restaurant with the provided ID to ensure it exists before creating a menu.    
        if (!restaurant) {                                                      //If the restaurant is not found, it returns a 404 status with a JSON message indicating that the restaurant was not found.
            return res
                .status(404)
                .json({ success: false, message: "Restaurant not found" });
        }
        const restaurantMenu = await RestaurantMenu.create({
            restaurant: req.params.restaurantId,
            items: req.body.items,
        });
        res.status(201).json({ success: true, data: restaurantMenu });
    }
    catch (err) {
        console.error(err);
        res.status(400).json({ success: false, message: err.message });
    }
};

// @desc    Update restaurant menu
// @route   PUT /api/v1/restaurants/:restaurantId/menus/:id
// @access  Private
exports.updateRestaurantMenu = async (req, res, next) => {
    try {
        let restaurantMenu = await RestaurantMenu.findOne({     //Search for a restaurant menu with matching IDs to ensure it exists before updating.
            _id: req.params.id,                                 //If the restaurant menu is not found, it returns a 404 status with a JSON message indicating that the restaurant menu was not found.
            restaurant: req.params.restaurantId,
        });
        if (!restaurantMenu) {
            return res
                .status(404)
                .json({ success: false, message: "Restaurant menu not found" });
        }           
        restaurantMenu = await RestaurantMenu.findByIdAndUpdate(
            restaurantMenu._id,
            req.body,
            {
                new: true,
                runValidators: true,
            },
        );
        res.status(200).json({ success: true, data: restaurantMenu });
    } catch (err) {
        console.error(err);
        res.status(400).json({ success: false, message: err.message });
    }   
};

// @desc    Delete restaurant menu
// @route   DELETE /api/v1/restaurants/:restaurantId/menus/:id
// @access  Private

exports.deleteRestaurantMenu = async (req, res, next) => {
    try {
        const restaurantMenu = await RestaurantMenu.findOne({   //Search for a restaurant menu with matching IDs to ensure it exists before deleting.
            _id: req.params.id,                                 //If the restaurant menu is not found, it returns a 404 status with a JSON message indicating that the restaurant menu was not found.
            restaurant: req.params.restaurantId,
        });
        if (!restaurantMenu) {
            return res
                .status(404)
                .json({ success: false, message: "Restaurant menu not found" });
        }

        await restaurantMenu.deleteOne();
        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        console.error(err);
        res.status(400).json({ success: false, message: err.message });
    }
};