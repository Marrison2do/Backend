require("dotenv").config();
const jsdom = require("jsdom");
const axios = require("axios");
const cron = require("node-cron");
const Receipt = require("../models/Receipts");
const Invoice = require("../models/Invoices");
const asyncWrapper = require("../middleware/async");
const { StatusCodes } = require("http-status-codes");
const { BadRequestError, NotFoundError } = require("../errors");

var cookie = "";
const url = process.env.SIC_URL;
const credentials = process.env.SIC_CREDENTIALS;

async function login() {
  try {
    const response = await axios({
      baseURL: url + "/Login/Login",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        path: "/Login/Login",
      },
      data: credentials,
    });
    console.log(response.headers);
    // console.log(response.headers["set-cookie"][0]);

    // cookie = response.headers["set-cookie"][0];
  } catch (error) {
    console.log(error);
  }
  console.log(cookie);
}

async function getData() {
  try {
    const response = await axios({
      baseURL: url + "/CFEs_emitidos?todos=True",
      method: "GET",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        path: "/Login/Login",

        Cookie: cookie,
      },
    });
    console.log(response.data);
  } catch (error) {}
}

function handleRequest() {
  if (cookie) {
    getData();
    return;
  }
  if (!cookie) login();
}

// cron.schedule("*/10 * * * * *", () => {
//   handleRequest();
// });

handleRequest();
