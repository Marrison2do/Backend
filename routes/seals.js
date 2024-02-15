const express = require("express");
const router = express.Router();

const {
  getAllSeals,
  getSeal,
  createSeal,
  createBulkSeals,
  updateSeal,
  deleteSeal,
} = require("../controllers/seals");

router.route("/").post(createSeal).get(getAllSeals);

router.route("/bulk/").post(createBulkSeals);

router.route("/:id").get(getSeal).patch(updateSeal).delete(deleteSeal);

module.exports = router;
