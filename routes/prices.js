const express = require("express");
const router = express.Router();

const {
  getAllPrices,
  getPrice,
  createPrice,
  createBulkPrices,
  updatePrice,
  deletePrice,
} = require("../controllers/prices");

router.route("/").post(createPrice).get(getAllPrices);

router.route("/bulk/").post(createBulkPrices);

router.route("/:id").get(getPrice).patch(updatePrice).delete(deletePrice);

module.exports = router;
