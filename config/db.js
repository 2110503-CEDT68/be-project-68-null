// Import mongoose library for MongoDB connection
const mongoose = require("mongoose");

// Function to connect to MongoDB database
const connectDB = async () => {
    // Set strict query mode
    mongoose.set("strictQuery", true);
    // Connect to MongoDB using environment variable
    const conn = await mongoose.connect(process.env.MONGO_URI);

    // Print connection host to console
    console.log(`MongoDB Connected: ${conn.connection.host}`);
};

// Export the connectDB function
module.exports = connectDB;
