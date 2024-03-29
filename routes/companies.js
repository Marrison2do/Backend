const express = require("express");
const router = express.Router();

const {
  getAllCompanies,
  getCompany,
  createCompany,
  createFilledCompany,
  updateCompany,
  deleteCompany,
} = require("../controllers/companies");

router.route("/").post(createCompany).get(getAllCompanies);

router.route("/filled/").post(createFilledCompany);

router.route("/:id").get(getCompany).patch(updateCompany).delete(deleteCompany);

module.exports = router;
