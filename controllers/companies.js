const Company = require("../models/Companies");
const Customer = require("../models/Customers");
const Invoice = require("../models/Invoices");
const User = require("../models/User");
const Receipt = require("../models/Receipts");
const asyncWrapper = require("../middleware/async");
const { StatusCodes } = require("http-status-codes");
const { BadRequestError, NotFoundError } = require("../errors");

const getAllCompanies = asyncWrapper(async (req, res) => {
  const {
    sort,
    name,
    rut,
    createdBy,
    customer,
    newerThan,
    olderThan,
    newerUpdateThan,
    olderUpdateThan,
    numericFilters,
  } = req.query;
  const queryObject = {};
  if (name) {
    queryObject.name = { $regex: name, $options: "i" };
  }
  if (rut) {
    queryObject.rut = rut;
  }
  if (createdBy) {
    const idUser = await User.find({
      name: { $regex: createdBy, $options: "i" },
    });
    queryObject.createdBy = idUser;
  }
  if (customer) {
    const idCustomer = await Customer.findOne({
      name: { $regex: customer, $options: "i" },
    });
    queryObject.customer = idCustomer._id;
  }
  if (newerThan && olderThan) {
    queryObject.createdAt = {
      $gte: new Date(newerThan),
      $lte: new Date(olderThan),
    };
  }
  if (newerThan && !olderThan) {
    queryObject.createdAt = { $gte: new Date(newerThan) };
  }
  if (!newerThan && olderThan) {
    queryObject.createdAt = { $lte: new Date(olderThan) };
  }
  if (newerUpdateThan && olderUpdateThan) {
    queryObject.createdAt = {
      $gte: new Date(newerUpdateThan),
      $lte: new Date(olderUpdateThan),
    };
  }
  if (newerUpdateThan && !olderUpdateThan) {
    queryObject.updatedAt = { $gte: new Date(newerUpdateThan) };
  }
  if (!newerUpdateThan && olderUpdateThan) {
    queryObject.updatedAt = { $lte: new Date(olderUpdateThan) };
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
    const options = ["debtUyu", "debtUsd"];
    filters = filters.split(",").forEach((item) => {
      const [field, operator, value] = item.split("-");
      if (options.includes(field)) {
        queryObject[field] = { [operator]: Number(value) };
      }
    });
  }

  const projection = {
    name: 1,
    description: 1,
    rut: 1,
    debtUyu: 1,
    debtUsd: 1,
    customer: 1,
    createdAt: 1,
    updatedAt: 1,
    invoices: 1,
    receipts: 1,
    color: 1,
  };

  let result = Company.find(queryObject, projection).populate(
    "customer",
    "name"
  );
  if (sort) {
    const sortList = sort.split(",").join(" ");
    result = result.sort(sortList);
  } else {
    result = result.sort("updatedAt");
  }

  const list = await result;
  res.status(StatusCodes.OK).json({ list, nbHits: list.length });
});

const getCompany = asyncWrapper(async (req, res) => {
  const { id: companyId } = req.params;
  const query = { _id: companyId };
  await Company.findOne(query)
    .populate("customer", "name")
    .populate("createdBy", "name")
    .populate("updatedBy", "name")
    .exec(async function (err, company) {
      if (err)
        return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
      if (!company) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ msg: `No Hay Empresa con el ID : ${companyId}` });
      }
      res.status(StatusCodes.OK).json(company);
    });
});

const createCompany = asyncWrapper(async (req, res) => {
  req.body.createdBy = req.user.userId;
  const company = await Company.create(req.body);
  const companyId = await company._id;
  Company.findOne({ _id: companyId })
    .populate("createdBy")
    .exec(async function (err, company) {
      if (err)
        return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
      company.createdBy.companies.push(companyId);
      await company.createdBy.save();
    });
  Company.findOne({ _id: companyId })
    .populate("customer")
    .exec(async function (err, company) {
      if (err)
        return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
      company.customer.company = companyId;
      company.customer.adminRank = false;
      await company.customer.save();
    });
  res.status(StatusCodes.CREATED).json({ company });
});

const createFilledCompany = asyncWrapper(async (req, res) => {
  req.body.createdBy = req.user.userId;
  const company = await Company.create(req.body);
  const invoiceList = req.body.invoiceList;
  const companyId = await company._id;
  Company.findOne({ _id: companyId })
    .populate("createdBy")
    .exec(async function (err, company) {
      if (err)
        return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
      company.createdBy.companies.push(companyId);
      await company.createdBy.save();
    });
  Company.findOne({ _id: companyId })
    .populate("customer")
    .exec(async function (err, company) {
      if (err)
        return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
      company.customer.company = companyId;
      company.customer.adminRank = false;
      await company.customer.save();
    });
  for (let i = 0; i < invoiceList.length; i++) {
    await Invoice.create({
      createdBy: req.body.createdBy,
      company: companyId,
      description: invoiceList[i].description,
      currency: invoiceList[i].currency,
      price: invoiceList[i].price,
      invoiceType: invoiceList[i].invoiceType,
      color: invoiceList[i].color,
      pack: invoiceList[i].pack,
      legalDate: invoiceList[i].legalDate,
      serial: invoiceList[i].serial,
      payed: invoiceList[i].payed,
    });
  }
  res.status(StatusCodes.CREATED).json({ company });
});

const updateCompany = asyncWrapper(async (req, res) => {
  const { id: companyId } = req.params;
  req.body.updatedBy = req.user.userId;
  const company = await Company.findOneAndUpdate({ _id: companyId }, req.body, {
    new: true,
    runValidators: true,
  });
  res.status(StatusCodes.OK).json({ company });
});

const deleteCompany = asyncWrapper(async (req, res) => {
  const { id: companyId } = req.params;
  await Company.findOne({ _id: companyId })
    .populate("invoices")
    .exec(async function (err, company) {
      if (err)
        return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
      if (!company) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ msg: `No Hay Empresa con el ID : ${companyId}` });
      }

      for (let i = 0; i < company.invoices.length; i++) {
        await Invoice.findOneAndDelete({ _id: company.invoices[i] });
      }
      for (let i = 0; i < company.receipts.length; i++) {
        await Receipt.findOneAndDelete({ _id: company.receipt[i] });
      }

      await Company.findOneAndDelete({ _id: companyId });
      res.status(StatusCodes.OK).json(company);
    });
});

module.exports = {
  getAllCompanies,
  getCompany,
  createCompany,
  createFilledCompany,
  updateCompany,
  deleteCompany,
};
