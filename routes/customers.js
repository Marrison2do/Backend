const express = require("express");
const router = express.Router();

const {
  getAllCustomers,
  getCustomer,
  createCustomer,
  createFilledCustomer,
  updateCustomer,
  deleteCustomer,
} = require("../controllers/customers");

router.route("/").post(createCustomer).get(getAllCustomers);

router.route("/filled/").post(createFilledCustomer);

router
  .route("/:id")
  .get(getCustomer)
  .patch(updateCustomer)
  .delete(deleteCustomer);

module.exports = router;
