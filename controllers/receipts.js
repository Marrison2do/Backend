const Receipt = require("../models/Receipts");
const Company = require("../models/Companies");
const asyncWrapper = require("../middleware/async");
const { StatusCodes } = require("http-status-codes");
const { BadRequestError, NotFoundError } = require("../errors");

const getAllReceipts = asyncWrapper(async (req, res) => {
  const {
    company,
    sort,
    createdBy,
    newerThan,
    olderThan,
    updatedBy,
    currency,
    set,
    numericFilters,
    page,
    pageSize,
  } = req.query;
  const startIndex = (page - 1) * pageSize;
  const endIndex = page * pageSize;
  const queryObject = {};

  if (currency) {
    queryObject.currency = currency;
  }
  if (set) {
    queryObject.set = set;
  }

  if (company) {
    const idCompany = await Company.findOne({
      name: { $regex: company, $options: "i" },
    });
    queryObject.company = idCompany._id;
  }

  if (createdBy) {
    const idUser = await User.find({
      name: { $regex: createdBy, $options: "i" },
    });
    queryObject.createdBy = idUser;
  }
  if (updatedBy) {
    const idUser = await User.find({
      name: { $regex: updatedBy, $options: "i" },
    });
    queryObject.updatedBy = idUser;
  }
  if (newerThan && olderThan) {
    queryObject.legalDate = {
      $gte: new Date(newerThan),
      $lte: new Date(olderThan),
    };
  }
  if (newerThan && !olderThan) {
    queryObject.legalDate = { $gte: new Date(newerThan) };
  }
  if (!newerThan && olderThan) {
    queryObject.legalDate = { $lte: new Date(olderThan) };
  }

  if (numericFilters) {
    const operatorMap = {
      ">": "$gt",
      ">=": "$gte",
      "=": "$eq",
      "<": "$lt",
      "<=": "$lte",
    };
    const regEx = /\b(>|>=|=|<|<=)\b/g;
    let filters = numericFilters.replace(
      regEx,
      (match) => `-${operatorMap[match]}-`
    );
    const options = ["price", "number"];
    filters = filters.split(",").forEach((item) => {
      const [field, operator, value] = item.split("-");
      if (options.includes(field)) {
        queryObject[field] = { [operator]: Number(value) };
      }
    });
  }
  const projection = {
    description: 1,
    price: 1,
    company: 1,
    legalDate: 1,
    currency: 1,
    invoices: 1,
    invoicesPrices: 1,
    set: 1,
    number: 1,
    color: 1,
  };

  let result = Receipt.find(queryObject, projection)
    .populate("company", "name")
    .populate("invoices");
  if (sort) {
    const sortList = sort.split(",").join(" ");
    result = result.sort(sortList);
  } else {
    result = result.sort("createdAt");
  }

  const list = await result;
  const totalPages = Math.ceil(list.length / pageSize);
  const paginatedList = list.slice(startIndex, endIndex);

  res
    .status(StatusCodes.OK)
    .json({ list: paginatedList, totalPages, nbHits: list.length });
});

const getReceipt = asyncWrapper(async (req, res) => {
  const { id: receiptId } = req.params;
  const query = { _id: receiptId };
  await Receipt.findOne(query)
    .populate("company", "name")
    .populate("createdBy", "name")
    .populate("updatedBy", "name")
    .exec(async function (err, receipt) {
      if (err)
        return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
      if (!receipt) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ msg: `No Hay Recibo con el ID : ${receiptId}` });
      }
      res.status(StatusCodes.OK).json(receipt);
    });
});

const createReceipt = asyncWrapper(async (req, res) => {
  req.body.createdBy = req.user.userId;
  const receipt = await Receipt.create(req.body);
  const receiptId = await receipt._id;
  const receiptPrice = await receipt.price;
  const receiptCurrency = await receipt.currency;
  Receipt.findOne({ _id: receiptId })
    .populate("invoices")
    .exec(async function (err, receipt) {
      if (err)
        return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
      for (i = 0; i < receipt.invoices.length; i++) {
        receipt.invoices[i].receipt = receiptId;
        receipt.invoices[i].payed = true;
        receipt.invoices[i].updatedBy = req.user.userId;
        await receipt.invoices[i].save();
      }
    });
  Receipt.findOne({ _id: receiptId })
    .populate("createdBy")
    .exec(async function (err, receipt) {
      if (err)
        return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
      receipt.createdBy.receipts.push(receiptId);
      await receipt.createdBy.save();
    });
  Receipt.findOne({ _id: receiptId })
    .populate("company")
    .exec(async function (err, receipt) {
      if (err)
        return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
      receipt.company.receipts.push(receiptId);
      if (receiptCurrency == "UYU") {
        receipt.company.debtUyu = receipt.company.debtUyu - receiptPrice;
      } else {
        receipt.company.debtUsd = receipt.company.debtUsd - receiptPrice;
      }
      await receipt.company.save();
    });
  res.status(StatusCodes.CREATED).json({ receipt });
});

const updateReceipt = asyncWrapper(async (req, res) => {
  // const receipt = await Receipt.findOne({ _id: receiptId }).populate("company");

  const { id: receiptId } = req.params;
  const oldReceipt = await Receipt.findOne({ _id: receiptId });
  Receipt.findOne({ _id: receiptId })
    .populate("invoices")
    .populate("company")
    .exec(async function (err, receipt) {
      if (err)
        return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });

      for (i = 0; i < receipt.invoices.length; i++) {
        receipt.invoices[i].receipt = null;
        receipt.invoices[i].payed = false;
        await receipt.invoices[i].save();
      }
    });

  req.body.updatedBy = req.user.userId;
  await Receipt.findOneAndUpdate({ _id: receiptId }, req.body, {
    new: true,
    runValidators: true,
  });
  const newReceipt = await Receipt.findOne({ _id: receiptId });
  Receipt.findOne({ _id: receiptId })
    .populate("invoices")
    .populate("company")
    .exec(async function (err, receipt) {
      if (err)
        return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
      for (i = 0; i < receipt.invoices.length; i++) {
        receipt.invoices[i].receipt = receiptId;
        receipt.invoices[i].payed = true;
        await receipt.invoices[i].save();
      }
    });

  await Receipt.findOne({ _id: receiptId });
  Receipt.findOne({ _id: receiptId })
    .populate("company")
    .exec(async function (err, receipt) {
      if (err)
        return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });

      if (oldReceipt.currency == "UYU") {
        receipt.company.debtUyu =
          receipt.company.debtUyu + oldReceipt.price - newReceipt.price;
      } else {
        receipt.company.debtUsd =
          receipt.company.debtUsd + oldReceipt.price - newReceipt.price;
      }
      await receipt.company.save();
    });

  res.status(StatusCodes.OK).json({ newReceipt });
});

const deleteReceipt = asyncWrapper(async (req, res) => {
  const { id: receiptId } = req.params;
  await Receipt.findOne({ _id: receiptId })
    .populate("company")
    .exec(async function (err, receipt) {
      if (err)
        return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
      if (!receipt) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ msg: `No Hay Recibo con el ID : ${receiptId}` });
      }
      let receiptPrice = await receipt.price;
      const receiptCurrency = await receipt.currency;
      const type = await receipt.receiptType;
      if (type == "creditMemo") {
        receiptPrice = -1 * receiptPrice;
      }
      if (receiptPrice) {
        if (receiptCurrency == "UYU") {
          receipt.company.debtUyu = receipt.company.debtUyu + receiptPrice;
        } else {
          receipt.company.debtUsd = receipt.company.debtUsd + receiptPrice;
        }
      }
      const companyIndex = receipt.company.receipts.indexOf(receipt._id);
      receipt.company.receipts.splice(companyIndex, 1);
      await receipt.company.save();
      Receipt.findOneAndDelete({ _id: receiptId })
        .populate("createdBy")
        .exec(async function (err, receipt) {
          if (err)
            return res
              .status(StatusCodes.NOT_FOUND)
              .json({ msg: `ID Inválida` });
          const userIndex = receipt.createdBy.receipts.indexOf(receipt._id);
          receipt.createdBy.receipts.splice(userIndex, 1);
          await receipt.createdBy.save();
        });

      res.status(StatusCodes.OK).json({ receipt });
    });
});

module.exports = {
  getAllReceipts,
  getReceipt,
  createReceipt,
  updateReceipt,
  deleteReceipt,
};
