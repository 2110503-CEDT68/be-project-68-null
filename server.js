const express = require("express");
const dotenv = require("dotenv");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUI = require("swagger-ui-express");

dotenv.config({ path: "./config/config.env" });

const cookies = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize"); // Prevent NoSQL injection
const helmet = require("helmet"); // Set security headers
const {xss} = require("express-xss-sanitizer"); // Prevent cross-site scripting (XSS) attacks
const hpp = require("hpp"); // Prevent HTTP parameter pollution attacks

// custom modules
const connectDB = require("./config/db"); // Connect to database
const restaurants = require("./routes/restaurants"); // Restaurant routes
const auth = require("./routes/auth"); // Authentication routes
const reservations = require("./routes/reservations"); // Reservation routes

// Connect to database
connectDB();

const app = express();
app.set('query parser', 'extended');

const localIps = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

const limiter = require("express-rate-limit")({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 10 minutes)
  skip: (req) => localIps.has(req.ip),
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

const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Restaurant Reservation API",
      version: "1.0.0",
      description: "REST API for managing restaurant reservations.\n\n**Rules:**\n- User can create at most **3 reservations per day** per restaurant\n- Reservation duration is **2 hours** (overlap check applied)\n- Reservations can only be made during **opening hours**",
    },
    servers: [
      {
        url: "http://localhost:5000/api/v1",
      },
    ],
  },
  apis: ["./swagger/*.yaml"],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerDocs));


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
