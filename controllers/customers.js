const Customer = require("../models/Customers");
const Task = require("../models/Tasks");
const User = require("../models/User");
const asyncWrapper = require("../middleware/async");
const { StatusCodes } = require("http-status-codes");
const { BadRequestError, NotFoundError } = require("../errors");

const getAllCustomers = asyncWrapper(async (req, res) => {
  const {
    description,
    sort,
    name,
    createdBy,
    company,
    newerThan,
    archive,
    olderThan,
    newerUpdateThan,
    olderUpdateThan,
    numericFilters,
    phoneNumber,
  } = req.query;
  const queryObject = {};
  const rank = req.user.rank;
  if (rank !== "admin") {
    queryObject.adminRank = false;
  }
  if (name) {
    queryObject.name = { $regex: name, $options: "i" };
  }
  if (description) {
    queryObject.description = { $regex: description, $options: "i" };
  }
  if (!archive) {
    queryObject.archive = false;
  }
  if (archive) {
    queryObject.archive = true;
  }
  if (company) {
    const idCompany = await Company.findOne({
      name: { $regex: company, $options: "i" },
    });
    console.log(idCompany.name);
    queryObject.company = idCompany._id;
  }
  if (createdBy) {
    const idUser = await User.find({
      name: { $regex: createdBy, $options: "i" },
    });
    queryObject.createdBy = idUser;
  }
  if (phoneNumber) {
    queryObject.phoneNumber = { $regex: phoneNumber, $options: "i" };
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
    queryObject.updatedAt = {
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
    debtUyu: 1,
    debtUsd: 1,
    company: 1,
    createdAt: 1,
    updatedAt: 1,
    phoneNumber: 1,
    description: 1,
    archive: 1,
  };

  let result = Customer.find(queryObject, projection);
  if (sort) {
    const sortList = sort.split(",").join(" ");
    result = result.sort(sortList);
  } else {
    result = result.sort("updatedAt");
  }

  const list = await result;
  res.status(StatusCodes.OK).json({ list, nbHits: list.length });
});

const getCustomer = asyncWrapper(async (req, res) => {
  const { id: customerId } = req.params;
  const rank = req.user.rank;
  if (rank !== "admin") {
    var query = { _id: customerId, adminRank: false };
  } else {
    var query = { _id: customerId };
  }

  await Customer.findOne(query)
    .populate("company", "name")
    .populate("createdBy", "name")
    .populate("updatedBy", "name")
    .exec(async function (err, customer) {
      if (err)
        return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
      if (!customer) {
        return res
          .status(404)
          .json({ msg: `No Hay Cliente con el ID : ${customerId}` });
      }
      res.status(StatusCodes.OK).json(customer);
    });
});

const createCustomer = asyncWrapper(async (req, res) => {
  req.body.createdBy = req.user.userId;
  const customer = await Customer.create({
    name: req.body.name,
    phoneNumber: req.body.phoneNumber,
    description: req.body.description,
    adminRank: req.body.adminRank,
    archive: req.body.archive,
    createdBy: req.body.createdBy,
  });
  const customerId = await customer._id;
  Customer.findOne({ _id: customerId })
    .populate("createdBy")
    .exec(async function (err, customer) {
      if (err)
        return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
      customer.createdBy.customers.push(customerId);
      await customer.createdBy.save();
    });
  res.status(StatusCodes.CREATED).json({ customer });
});

const updateCustomer = asyncWrapper(async (req, res) => {
  const { id: customerId } = req.params;
  req.body.updatedBy = req.user.userId;
  await Customer.findOneAndUpdate({ _id: customerId }, req.body, {
    new: true,
    runValidators: true,
  });
  const customer = await Customer.findOne({ _id: customerId });
  if (!customer) {
    return next(
      createCustomError(
        `No Hay Cliente con el ID : ${customerId}`,
        StatusCodes.NOT_FOUND
      )
    );
  }

  res.status(StatusCodes.OK).json(customer);
});

const deleteCustomer = asyncWrapper(async (req, res) => {
  const { id: customerId } = req.params;
  await Customer.findOne({ _id: customerId })
    .populate("tasks")
    .exec(async function (err, customer) {
      if (err)
        return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
      if (!customer) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ msg: `No Hay Cliente con el ID : ${customerId}` });
      }

      for (let i = 0; i < customer.tasks.length; i++) {
        await Task.findOneAndDelete({ _id: customer.tasks[i] });
      }

      await Customer.findOneAndDelete({ _id: customerId });
      res.status(StatusCodes.OK).json(customer);
    });
});

module.exports = {
  getAllCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
