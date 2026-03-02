const express = require("express");
const dotenv = require("dotenv");
const yaml = require("js-yaml");
const fs = require("fs");

dotenv.config({ path: "./config/config.env" });

const cookies = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize"); // Prevent NoSQL injection
const helmet = require("helmet"); // Set security headers
const {xss} = require("express-xss-sanitizer"); // Prevent cross-site scripting (XSS) attacks
const hpp = require("hpp"); // Prevent HTTP parameter pollution attacks
const swaggerUi = require("swagger-ui-express"); 

// custom modules
const connectDB = require("./config/db"); // Connect to database
const restaurants = require("./routes/restaurants"); // Restaurant routes
const auth = require("./routes/auth"); // Authentication routes
const reservations = require("./routes/reservations"); // Reservation routes

// Connect to database
connectDB();

const app = express();
app.set('query parser', 'extended');

const limiter = require("express-rate-limit")({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 10 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const cors = require('cors');
app.use(cors());
app.use(express.json());
app.use(cookies());
app.use(limiter);
app.use(mongoSanitize());
app.use(helmet());
app.use(xss());
app.use(hpp());

const swaggerDocument = yaml.load(fs.readFileSync("./swagger/swagger.yaml", "utf8"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ...existing code...

app.use("/api/v1/restaurants", restaurants);
app.use("/api/v1/auth", auth);
app.use("/api/v1/reservations", reservations);

const PORT = process.env.PORT || 5000;

const server = app.listen(
    PORT,
    console.log(
        "Server running in ",
        process.env.NODE_ENV,
        " mode on port ",
        PORT,
    ),
);

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
    console.log(`Error: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
});
