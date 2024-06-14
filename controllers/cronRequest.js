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
      method: "post",
      baseURL: url,
      path: "/Login/Login",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: credentials,
    });
    console.log(response);
  } catch (error) {
    console.log(error);
  }
  console.log(`logueando ${credentials}`);
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

cron.schedule("* * * * *", () => {
  handleRequest();
});
