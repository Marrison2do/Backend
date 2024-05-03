const Customer = require("../models/Customers");
const Task = require("../models/Tasks");
const User = require("../models/User");
const Check = require("../models/Checks");
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

  const page = req.query.page || 1;
  const pageSize = req.query.pageSize || 50;

  const startIndex = (page - 1) * pageSize;
  const endIndex = page * pageSize;
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
    color: 1,
  };

  let result = Customer.find(queryObject, projection);
  if (sort) {
    const sortList = sort.split(",").join(" ");
    result = result.sort(sortList);
  } else {
    result = result.sort("updatedAt");
  }

  const list = await result;
  const totalPages = Math.ceil(list.length / pageSize);
  const paginatedList = list.slice(startIndex, endIndex);

  res
    .status(StatusCodes.OK)
    .json({ list: paginatedList, totalPages, nbHits: list.length });
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
          .status(StatusCodes.NOT_FOUND)
          .json({ msg: `No Hay Cliente con el ID : ${customerId}` });
      }
      res.status(StatusCodes.OK).json(customer);
    });
});

const createCustomer = asyncWrapper(async (req, res) => {
  req.body.createdBy = req.user.userId;
  const rank = req.user.rank;
  if (rank == "admin") req.body.adminRank = true;
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

const createFilledCustomer = asyncWrapper(async (req, res) => {
  req.body.createdBy = req.user.userId;
  const rank = req.user.rank;
  if (rank == "admin") req.body.adminRank = true;
  const customer = await Customer.create({
    name: req.body.name,
    phoneNumber: req.body.phoneNumber,
    description: req.body.description,
    adminRank: req.body.adminRank,
    archive: req.body.archive,
    createdBy: req.body.createdBy,
    debtUyu: req.body.debtUyu,
    debtUsd: req.body.debtUsd,
  });
  const taskList = req.body.taskList;
  const customerId = await customer._id;
  Customer.findOne({ _id: customerId })
    .populate("createdBy")
    .exec(async function (err, customer) {
      if (err)
        return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
      customer.createdBy.customers.push(customerId);
      await customer.createdBy.save();
    });
  for (let i = 0; i < taskList.length; i++) {
    const task = await Task.create({
      createdBy: req.body.createdBy,
      customer: customerId,
      description: taskList[i].description,
      currency: taskList[i].currency,
      price: taskList[i].price,
      type: taskList[i].type,
      color: taskList[i].color,
      pack: taskList[i].pack,
      date: taskList[i].date,
    });
    const taskId = await task._id;
    Task.findOne({ _id: taskId })
      .populate("customer")
      .exec(async function (err, task) {
        if (err) return new NotFoundError(err);
        task.customer.tasks.push(taskId);

        await task.customer.save();
      });
  }

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
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ msg: `No Hay Cliente con el ID : ${customerId}` });
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
      for (let i = 0; i < customer.checks.length; i++) {
        await Check.findOneAndDelete({ _id: customer.checks[i] });
      }

      await Customer.findOneAndDelete({ _id: customerId });
      res.status(StatusCodes.OK).json(customer);
    });
});

module.exports = {
  getAllCustomers,
  getCustomer,
  createCustomer,
  createFilledCustomer,
  updateCustomer,
  deleteCustomer,
};
