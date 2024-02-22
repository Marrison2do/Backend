const asyncWrapper = require("../middleware/async");
const { StatusCodes } = require("http-status-codes");
const { BadRequestError, NotFoundError } = require("../errors");
const axios = require("axios");

const getExchangeRate = asyncWrapper(async (req, res) => {
  const dateHandler = (miliseconds) => {
    let timestamp = Date.now();
    let isoDate = new Date(timestamp - miliseconds);
    let year = isoDate.getFullYear();
    let month = isoDate.getMonth();
    let day = isoDate.getDate();
    return year + "/" + (month + 1) + "/" + day;
  };

  const today = dateHandler(0);
  const monthAgo = dateHandler(2592000000);
  const bodySting = `<x:Envelope
        xmlns:x="http://schemas.xmlsoap.org/soap/envelope/"
        xmlns:cot="Cotiza">
        <x:Header/>
        <x:Body>
          <cot:wsbcucotizaciones.Execute>
            <cot:Entrada>
              <cot:Moneda>
                <cot:item>2224</cot:item>
              </cot:Moneda>
              <cot:FechaDesde>${monthAgo}</cot:FechaDesde>
              <cot:FechaHasta>${today}</cot:FechaHasta>
              <cot:Grupo>0</cot:Grupo>
            </cot:Entrada>
          </cot:wsbcucotizaciones.Execute>
        </x:Body>
      </x:Envelope>`;
  async function checkExchange() {
    try {
      const response = await axios({
        method: "post",
        // baseURL: `${process.env.REACT_APP_API_BASE}/`,
        baseURL: `https://cotizaciones.bcu.gub.uy/wscotizaciones/servlet/awsbcucotizaciones`,

        data: bodySting,
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
  const exchangeRate = await checkExchange();

  res.status(StatusCodes.OK).json({ exchangeRate });
});

module.exports = {
  getExchangeRate,
};
