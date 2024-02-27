const Invoice = require("../models/Invoices");
const Company = require("../models/Companies");
const Receipt = require("../models/Receipts");
const asyncWrapper = require("../middleware/async");
const { StatusCodes } = require("http-status-codes");
const { BadRequestError, NotFoundError } = require("../errors");

const getAllInvoices = asyncWrapper(async (req, res) => {
  const {
    description,
    company,
    sort,
    createdBy,
    receipt,
    newerThan,
    olderThan,
    updatedBy,
    payed,
    currency,
    invoiceType,
    numericFilters,
    modal,
    price,
    createdAt,
    legalDate,
    page,
    pageSize,
  } = req.query;
  const startIndex = (page - 1) * pageSize;
  const endIndex = page * pageSize;
  const queryObject = {};
  const receiptQuery = {};

  if (currency) {
    queryObject.currency = currency;
    receiptQuery.currency = currency;
  }
  if (description) {
    queryObject.description = { $regex: description, $options: "i" };
  }
  if (receipt) {
    queryObject.receipt = receipt;
  }
  if (payed) {
    queryObject.payed = payed;
  }
  if (company) {
    const idCompany = await Company.findOne({
      name: { $regex: company, $options: "i" },
    });
    queryObject.company = idCompany._id;
    receiptQuery.company = idCompany._id;
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
    receiptQuery.legalDate = {
      $gte: new Date(newerThan),
      $lte: new Date(olderThan),
    };
  }
  if (newerThan && !olderThan) {
    queryObject.legalDate = { $gte: new Date(newerThan) };
    receiptQuery.legalDate = { $gte: new Date(newerThan) };
  }
  if (!newerThan && olderThan) {
    queryObject.legalDate = { $lte: new Date(olderThan) };
    receiptQuery.legalDate = { $lte: new Date(olderThan) };
  }
  if (invoiceType) {
    queryObject.invoiceType = invoiceType;
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
    const options = ["price", "serial"];
    filters = filters.split(",").forEach((item) => {
      const [field, operator, value] = item.split("-");
      if (options.includes(field)) {
        queryObject[field] = { [operator]: Number(value) };
      }
    });
  }
  const projection = {
    createdBy: 0,
    updatedBy: 0,
  };
  if (modal) {
    let invoiceList = await Invoice.find(queryObject, projection).populate(
      "company",
      "name"
    );
    let receiptList = await Receipt.find(receiptQuery, projection).populate(
      "company",
      "name"
    );

    receiptList.map((item) => {
      item.serial = item.number;
      return item;
    });
    let list = [...invoiceList, ...receiptList];

    list.sort((a, b) =>
      a.legalDate > b.legalDate
        ? 1
        : a.legalDate === b.legalDate
        ? a.number < b.number
          ? 1
          : -1
        : -1
    );

    const totalPages = Math.ceil(list.length / pageSize);
    const paginatedList = list.slice(startIndex, endIndex);

    res
      .status(StatusCodes.OK)
      .json({ list: paginatedList, totalPages, nbHits: list.length });
  }
  if (!modal) {
    let result = Invoice.find(queryObject, projection).populate(
      "company",
      "name"
    );
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
  }
});

const getInvoice = asyncWrapper(async (req, res) => {
  const { id: invoiceId } = req.params;
  const query = { _id: invoiceId };
  await Invoice.findOne(query)
    .populate("company", "name")
    .populate("createdBy", "name")
    .populate("updatedBy", "name")
    .exec(async function (err, invoice) {
      if (err)
        return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
      if (!invoice) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ msg: `No Hay Factura con el ID : ${invoiceId}` });
      }
      res.status(StatusCodes.OK).json(invoice);
    });
});

const createInvoice = asyncWrapper(async (req, res) => {
  req.body.createdBy = req.user.userId;
  const invoice = await Invoice.create(req.body);
  const invoiceId = await invoice._id;
  let invoicePrice = await invoice.price;
  const invoiceCurrency = await invoice.currency;
  const type = await invoice.invoiceType;
  Invoice.findOne({ _id: invoiceId })
    .populate("createdBy")
    .exec(async function (err, invoice) {
      if (err)
        return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
      invoice.createdBy.invoices.push(invoiceId);
      await invoice.createdBy.save();
    });
  Invoice.findOne({ _id: invoiceId })
    .populate("company")
    .exec(async function (err, invoice) {
      if (err)
        return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
      invoice.company.invoices.push(invoiceId);
      if (type == "creditMemo") {
        invoicePrice = -1 * invoicePrice;
      }
      if (invoiceCurrency == "UYU") {
        invoice.company.debtUyu = invoice.company.debtUyu + invoicePrice;
      } else {
        invoice.company.debtUsd = invoice.company.debtUsd + invoicePrice;
      }

      await invoice.company.save();
    });
  res.status(StatusCodes.CREATED).json({ invoice });
});

const updateInvoice = asyncWrapper(async (req, res) => {
  const { id: invoiceId } = req.params;
  const oldInvoice = await Invoice.findOne({ _id: invoiceId });
  var invoicePrice = await oldInvoice.price;
  const invoiceCurrency = await oldInvoice.currency;
  const type = await oldInvoice.invoiceType;
  await Invoice.findOne({ _id: invoiceId })
    .populate("company")
    .exec(async function (err, invoice) {
      if (err)
        return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
      if (!invoice) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ msg: `No Hay Factura con el ID : ${invoiceId}` });
      }

      if (type == "creditMemo") {
        invoicePrice = -1 * invoicePrice;
      }
      if (invoicePrice) {
        if (invoiceCurrency == "UYU") {
          invoice.company.debtUyu = invoice.company.debtUyu - invoicePrice;
        } else {
          invoice.company.debtUsd = invoice.company.debtUsd - invoicePrice;
        }
      }
      await invoice.company.save();
    });

  req.body.updatedBy = req.user.userId;
  await Invoice.findOneAndUpdate({ _id: invoiceId }, req.body, {
    new: true,
    runValidators: true,
  });
  const newInvoice = await Invoice.findOne({ _id: invoiceId });
  let newInvoicePrice = await newInvoice.price;
  const newInvoiceCurrency = await newInvoice.currency;
  const newType = await newInvoice.invoiceType;
  Invoice.findOne({ _id: invoiceId })
    .populate("company")
    .exec(async function (err, invoice) {
      if (err)
        return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
      if (newType == "creditMemo") {
        newInvoicePrice = -1 * newInvoicePrice;
      }
      if (newInvoicePrice) {
        if (newInvoiceCurrency == "UYU") {
          invoice.company.debtUyu = invoice.company.debtUyu + newInvoicePrice;
        } else {
          invoice.company.debtUsd = invoice.company.debtUsd + newInvoicePrice;
        }
      }
      await invoice.company.save();
    });

  res.status(StatusCodes.OK).json({ newInvoice });
});

const deleteInvoice = asyncWrapper(async (req, res) => {
  const { id: invoiceId } = req.params;
  await Invoice.findOne({ _id: invoiceId })
    .populate("company")
    .exec(async function (err, invoice) {
      if (err)
        return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
      if (!invoice) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ msg: `No Hay Factura con el ID : ${invoiceId}` });
      }
      let invoicePrice = await invoice.price;
      const invoiceCurrency = await invoice.currency;
      const type = await invoice.invoiceType;
      if (type == "creditMemo") {
        invoicePrice = -1 * invoicePrice;
      }
      if (invoicePrice) {
        if (invoiceCurrency == "UYU") {
          invoice.company.debtUyu = invoice.company.debtUyu - invoicePrice;
        } else {
          invoice.company.debtUsd = invoice.company.debtUsd - invoicePrice;
        }
      }
      const companyIndex = invoice.company.invoices.indexOf(invoice._id);
      invoice.company.invoices.splice(companyIndex, 1);
      await invoice.company.save();
      Invoice.findOneAndDelete({ _id: invoiceId })
        .populate("createdBy")
        .exec(async function (err, invoice) {
          if (err)
            return res
              .status(StatusCodes.NOT_FOUND)
              .json({ msg: `ID Inválida` });
          const userIndex = invoice.createdBy.invoices.indexOf(invoice._id);
          invoice.createdBy.invoices.splice(userIndex, 1);
          await invoice.createdBy.save();
        });

      res.status(StatusCodes.OK).json({ invoice });
    });
});

module.exports = {
  getAllInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
};
