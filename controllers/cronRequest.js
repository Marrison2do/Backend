const jsdom = require("jsdom");
const axios = require("axios");
const cron = require("node-cron");
const Receipt = require("../models/Receipts");
const Invoice = require("../models/Invoices");
const asyncWrapper = require("../middleware/async");
const { StatusCodes } = require("http-status-codes");
const { BadRequestError, NotFoundError } = require("../errors");

var cookie = "";
async function login() {
  console.log("logueando");
  cookie = "milanesa";
}

async function getData() {
  console.log(`cookie :${cookie}`);
  cookie = "";
}

function handleRequest() {
  if (cookie) {
    getData();
    return;
  }
  if (!cookie) login();
}

cron.schedule("*/5 * * * * *", () => {
  handleRequest();
});
