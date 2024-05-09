require("dotenv").config();
const asyncWrapper = require("../middleware/async");
const { StatusCodes } = require("http-status-codes");
const { BadRequestError, NotFoundError } = require("../errors");
const axios = require("axios");

const getCookies = asyncWrapper(async (req, res) => {
  async function checkExchange() {
    try {
      const response = await axios({
        method: "post",
        baseURL: `https://web-prod-kitfe-2.cloud.sicfe.uy/Login/Login`,

        data: { mode: "raw", raw: process.env.SICFE_CREDENTIALS },
      });
      //   const parser = new DOMParser();
      //   const xmlDoc = parser.parseFromString(response.data, "text/xml");

      //   const cot = xmlDoc.getElementsByTagName("TCC")[0].childNodes[0].nodeValue;
      //   cot;
      return response.data;
    } catch (error) {
      console.log(error);
      return 40;
    }
  }
  const xmlString = await checkExchange();

  res.status(StatusCodes.OK).json({ xmlString });
});

module.exports = {
  getCookies,
};
