/******************************************************
* ITE5315 – Assignment 2
* I declare that this assignment is my own work in accordance with Humber Academic Policy.
* Name: Ravindar Pudugurthi  Student ID: N01670407  Date: 29-10-2025
******************************************************/

const express = require('express');
const path = require('path');
const fs = require('fs');
const exphbs = require('express-handlebars');
const { body, validationResult } = require('express-validator');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.set('views', path.join(__dirname, 'views'));

// Handlebars setup with helpers
const hbs = exphbs.create({
  extname: ".hbs",
  helpers: {
    serviceFeeValue: (serviceFee) => (serviceFee && serviceFee.trim() !== "" ? serviceFee : "0"),
    highlightEmptyFee: (serviceFee) => (serviceFee && serviceFee.trim() !== "" ? "" : "highlight-row"),
    add: (a, b) => a + b,
    subtract: (a, b) => a - b,
    gt: (a, b) => a > b,
    lt: (a, b) => a < b
  }
});

app.engine(".hbs", hbs.engine);
app.set('view engine', 'hbs');

// Load Airbnb data
let airbnbData = [];
fs.readFile("airbnb_with_photos.json", "utf8", (err, data) => {
  if (!err) {
    airbnbData = JSON.parse(data);
    console.log(airbnbData[0])
  }
});

// Routes
app.get('/', (req, res) => res.render('index', { title: 'Express' }));

app.get('/users', (req, res) => res.send('respond with a resource'));

app.get("/data", (req, res) => {
  console.log(airbnbData);
  res.render('dataload', { message: 'JSON data is loaded and ready!' });
});

app.get("/data/:index", (req, res) => {
  const idx = parseInt(req.params.index);
  if (idx >= 0 && idx < airbnbData.length) {
    res.render("item", { item: airbnbData[idx] });
  } else {
    res.render('error', { title: 'Error', message: 'Invalid index' });
  }
});

// Search by ID
app.get("/search/id", (req, res) => res.render("searchById", { title: "Search by Property Id" }));

app.post("/search/id",
  body("id").notEmpty().withMessage("Property ID is required")
            .isNumeric().withMessage("Property ID must be numeric")
            .trim().escape(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render("error", { title: "Validation Error", message: errors.array().map(e => e.msg).join(", ") });
    }

    const id = req.body.id;
    const item = airbnbData.find(p => String(p.id) === String(id));

    if (item) {
      res.render("item", { item });
    } else {
      res.render("error", { title: "Error", message: "Property ID not found" });
    }
  }
);

// Search by Name
app.get("/search/name", (req, res) => res.render("searchByName", { title: "Search by Property Name" }));

app.get("/searchname", (req, res) => {
  const nameQuery = req.query.name ? req.query.name.toLowerCase() : "";
  if (!nameQuery) {
    return res.render("error", { title: "Validation Error", message: "Property Name is required" });
  }

  const results = airbnbData.filter(p => p.NAME.toLowerCase().includes(nameQuery));
  if (results.length > 0) {
    const page = parseInt(req.query.page) || 1;
    const perPage = 100;
    const totalPages = Math.ceil(results.length / perPage);
    const items = results.slice((page - 1) * perPage, page * perPage);

    res.render("searchResults", {
      items,
      currentPage: page,
      totalPages,
      queryName: req.query.name
    });
  } else {
    res.render("error", { title: "Error", message: "No matching properties found." });
  }
});

// View Data
app.get("/viewData", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const perPage = 100;
  const totalPages = Math.ceil(airbnbData.length / perPage);
  const items = airbnbData.slice((page - 1) * perPage, page * perPage);

  res.render("viewData", { items, currentPage: page, totalPages });
  console.log(items)
});

// View Clean Data
app.get("/viewData/clean", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const perPage = 100;

  const cleanItems = airbnbData.filter(item => item["service fee"] && item["service fee"].trim() !== "");
  const totalPages = Math.ceil(cleanItems.length / perPage);
  const items = cleanItems.slice((page - 1) * perPage, page * perPage);

  res.render("viewDataClean", { items, currentPage: page, totalPages });
});

// Search by Price
app.get("/viewData/price", (req, res) => res.render("priceForm", { title: "Search by Price Range" }));

app.post("/viewData/price",
  [
    body("minPrice")
      .notEmpty().withMessage("Min Price is required")
      .isNumeric().withMessage("Min Price must be numeric")
      .trim().escape(),
    body("maxPrice")
      .notEmpty().withMessage("Max Price is required")
      .isNumeric().withMessage("Max Price must be numeric")
      .trim().escape()
  ],
  (req, res) => {
    const minPrice = parseFloat(req.body.minPrice) || 0;
    const maxPrice = parseFloat(req.body.maxPrice) || Number.MAX_SAFE_INTEGER;
    const page = parseInt(req.query.page) || 1;
    const perPage = 100;

    const filteredItems = airbnbData.filter(item => {
      const price = parseFloat((item.price || "0").replace(/[$,]/g, "")) || 0;
      return price >= minPrice && price <= maxPrice;
    });

    const totalPages = Math.ceil(filteredItems.length / perPage);
    const items = filteredItems.slice((page - 1) * perPage, page * perPage);

    res.render("viewDataPrice", { items, currentPage: page, totalPages, minPrice, maxPrice });
  }
);


// Catch-all route
app.get('*', (req, res) => res.render('error', { title: 'Error', message: 'Wrong Route' }));

// Start server
app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
