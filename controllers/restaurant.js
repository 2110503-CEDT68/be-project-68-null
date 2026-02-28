const Reservation = require("../models/Reservation");
const Restaurant = require("../models/Restaurant");

// @desc    Get all restaurants
// @route   GET /api/v1/restaurants
// @access  Public
exports.getRestaurants = async (req, res, next) => {
  try {
    let query;

    // Copy req.query
    const reqQuery = { ...req.query };
    // Fields to exclude from filtering
    const removeFields = ["select", "sort", "page", "limit"];

    removeFields.forEach((param) => delete reqQuery[param]);

    let queryStr = JSON.stringify(reqQuery);
    queryStr = queryStr.replace(
      /\b(gt|gte|lt|lte|in)\b/g,
      (match) => `$${match}`,
    );

    // สร้าง query object จาก JSON ที่แปลงแล้ว
    const parsedQuery = JSON.parse(queryStr);
    query = Restaurant.find(parsedQuery);

    // Select Fields
    if (req.query.select) {
      const fields = req.query.select.split(",").join(" ");
      query = query.select(fields);
    }
    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt");
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    // ✅ FIX: นับจำนวนข้อมูลเฉพาะที่ตรงกับ Filter เท่านั้น
    const total = await Restaurant.countDocuments(parsedQuery);

    query = query.skip(startIndex).limit(limit);

    // execute query
    const restaurants = await query;

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    // status 200 ok
    res.status(200).json({
      success: true,
      count: restaurants.length,
      pagination, // ✅ FIX: เพิ่ม pagination ส่งกลับไปให้ Frontend
      data: restaurants,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: "Cannot get restaurants" });
  }
};

// @desc    Get single restaurant
// @route   GET /api/v1/restaurants/:id
// @access  Public
exports.getRestaurant = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res
        .status(404)
        .json({ success: false, message: "Restaurant not found" });
    }

    res.status(200).json({ success: true, data: restaurant });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: "Cannot get restaurant" });
  }
};

// @desc    Create new restaurant
// @route   POST /api/v1/restaurants
// @access  Private
exports.createRestaurant = async (req, res, next) => {
  try {
    // ✅ FIX: เพิ่ม try...catch ป้องกัน Server แครช
    const restaurant = await Restaurant.create(req.body);
    res.status(201).json({ success: true, data: restaurant });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Update restaurant
// @route   PUT /api/v1/restaurants/:id
// @access  Private
exports.updateRestaurant = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!restaurant) {
      return res
        .status(404)
        .json({ success: false, message: "Restaurant not found" });
    }

    res.status(200).json({ success: true, data: restaurant });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Delete restaurant
// @route   DELETE /api/v1/restaurants/:id
// @access  Private
exports.deleteRestaurant = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: `Restaurant not found with id of ${req.params.id}`,
      });
    }

    // ลบการจองทั้งหมดที่ผูกกับร้านนี้
    await Reservation.deleteMany({ restaurant: req.params.id });

    await restaurant.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};
