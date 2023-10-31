const express = require("express");
const router = express.Router();

const { getExchangeRate } = require("../controllers/exchange");

router.route("/").get(getExchangeRate);

module.exports = router;
