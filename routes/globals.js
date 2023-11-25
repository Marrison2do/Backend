const express = require("express");
const router = express.Router();

const {
  getAllGlobals,
  getGlobal,
  createGlobal,
  updateGlobal,
  deleteGlobal,
} = require("../controllers/globals");

router.route("/").post(createGlobal).get(getAllGlobals);

router.route("/:id").get(getGlobal).patch(updateGlobal).delete(deleteGlobal);

module.exports = router;
