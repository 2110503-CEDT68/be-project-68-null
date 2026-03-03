# Restaurant Reservations API ฿฿

A Node.js backend for managing restaurant reservations with user authentication.

## Quick Start

```sh
npm install
cp config/config.example.env config/config.env  # Configure environment variables
npm run dev  # Start development server
```

## Features

- User authentication (register/login/logout)
- Restaurant browsing and management
- Reservation booking and management
- Restaurant menu management
- JWT-based authorization

## Project Structure

```
controllers/     # Route handlers
models/          # Database schemas (User, Restaurant, Reservation, Menu)
routes/          # API endpoints
middleware/      # Auth middleware
config/          # Database & environment config
swagger/         # API documentation
```

## API Quick Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Create new user |
| POST | /auth/login | User login |
| GET | /restaurants | List all restaurants |
| POST | /reservations | Create reservation |
| GET | /menu | View restaurant menus |

## Tech Stack

- Node.js + Express
- MongoDB
- JWT Authentication
- RESTful API

---

## Contributors

| Name | Contact |
|------|---------|
| Tanakrit Onjinda | 6833104021 |
| Suphachok Chosanthia | 6833258021 |
| Theanrawich Thungpromsri | 6833127521 |

---

[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/iG82Gnyy)
