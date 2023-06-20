const Check = require("../models/Checks");
const Task = require("../models/Tasks");
const Customer = require("../models/Customers");
const asyncWrapper = require("../middleware/async");
const { StatusCodes } = require("http-status-codes");
const { BadRequestError, NotFoundError } = require("../errors");

const getAllChecks = asyncWrapper(async (req, res) => {
  const {
    description,
    customer,
    sort,
    createdBy,
    bank,
    newerThan,
    olderThan,
    payBefore,
    PayAfter,
    updatedBy,
    set,
    currency,
    numericFilters,
  } = req.query;
  const queryObject = {};
  const rank = req.user.rank;
  if (rank !== "admin") {
    queryObject.adminRank = false;
  }
  if (currency) {
    queryObject.currency = currency;
  }
  if (set) {
    queryObject.set = set;
  }
  if (customer) {
    const idCustomer = await Customer.findOne({
      name: { $regex: customer, $options: "i" },
    });
    queryObject.customer = idCustomer._id;
  }
  if (description) {
    queryObject.description = { $regex: description, $options: "i" };
  }
  if (bank) {
    queryObject.bank = { $regex: bank, $options: "i" };
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
  if (PayAfter && payBefore) {
    queryObject.paymentDate = {
      $gte: new Date(PayAfter),
      $lte: new Date(payBefore),
    };
  }
  if (PayAfter && !payBefore) {
    queryObject.paymentDate = { $gte: new Date(PayAfter) };
  }
  if (!PayAfter && payBefore) {
    queryObject.paymentDate = { $lte: new Date(payBefore) };
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
    bank: 1,
    legalDate: 1,
    currency: 1,
    customer: 1,
    set: 1,
    paymentDate: 1,
    number: 1,
    task: 1,
  };

  let result = Check.find(queryObject, projection);
  if (sort) {
    const sortList = sort.split(",").join(" ");
    result = result.sort(sortList);
  } else {
    result = result.sort("createdAt");
  }

  const list = await result;
  res.status(StatusCodes.OK).json({ list, nbHits: list.length });
});

const getCheck = asyncWrapper(async (req, res) => {
  const { id: checkId } = req.params;
  const rank = req.user.rank;
  if (rank !== "admin") {
    var query = { _id: checkId, adminRank: false };
  } else {
    var query = { _id: checkId };
  }
  await Check.findOne(query).exec(async function (err, check) {
    if (err) return NotFoundError(err);
    if (!check) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ msg: `No check with id : ${checkId}` });
    }
    res.status(StatusCodes.OK).json(check);
  });
});

const createCheck = asyncWrapper(async (req, res) => {
  req.body.task.createdBy = req.user.userId;
  req.body.check.createdBy = req.user.userId;
  const task = await Task.create(req.body.task);
  const taskId = await task._id;
  req.body.check.task = taskId;
  const check = await Check.create(req.body.check);
  const checkId = await check._id;
  let taskPrice = await task.price;
  const taskCurrency = await task.currency;
  const type = await task.type;
  Task.findOne({ _id: taskId })
    .populate("customer")
    .exec(async function (err, task) {
      if (err) return new NotFoundError(err);
      task.customer.tasks.push(taskId);
      if (type == "payment") {
        taskPrice = -1 * taskPrice;
      }
      if (taskPrice) {
        if (taskCurrency == "UYU") {
          task.customer.debtUyu = task.customer.debtUyu + taskPrice;
        } else {
          task.customer.debtUsd = task.customer.debtUsd + taskPrice;
        }
      }
      task.customer.checks.push(checkId);
      await task.customer.save();
    });
  Task.findOne({ _id: taskId })
    .populate("createdBy")
    .exec(async function (err, task) {
      if (err) return new NotFoundError(err);
      task.createdBy.tasks.push(taskId);
      task.createdBy.checks.push(checkId);
      await task.createdBy.save();
    });

  res.status(StatusCodes.CREATED).json({ check, task });
});

const updateCheck = asyncWrapper(async (req, res) => {
  const { id: checkId } = req.params;
  const { id: taskId } = req.body.taskId;
  const oldTask = await Task.findOne({ _id: taskId });
  var taskPrice = await oldTask.price;
  const taskCurrency = await oldTask.currency;
  const type = await oldTask.type;
  await Task.findOne({ _id: taskId })
    .populate("customer")
    .exec(async function (err, task) {
      if (err) return new NotFoundError(err);
      if (!task) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ msg: `No task with id : ${taskId}` });
      }
      if (type == "payment") {
        taskPrice = -1 * taskPrice;
      }
      if (taskPrice) {
        if (taskCurrency == "UYU") {
          task.customer.debtUyu = task.customer.debtUyu - taskPrice;
        } else {
          task.customer.debtUsd = task.customer.debtUsd - taskPrice;
        }
      }
      await task.customer.save();
    });
  req.body.task.updatedBy = req.user.userId;
  req.body.check.updatedBy = req.user.userId;
  await Task.findOneAndUpdate({ _id: taskId }, req.body.task, {
    new: true,
    runValidators: true,
  });
  await Check.findOneAndUpdate({ _id: checkId }, req.body.check, {
    new: true,
    runValidators: true,
  });
  const check = await Check.findOne({ _id: checkId });
  const newTask = await Task.findOne({ _id: taskId });
  let newTaskPrice = await newTask.price;
  const newTaskCurrency = await newTask.currency;
  const newType = await newTask.type;
  Task.findOne({ _id: taskId })
    .populate("customer")
    .exec(async function (err, task) {
      if (err) return new NotFoundError(err);
      if (newType == "payment") {
        newTaskPrice = -1 * newTaskPrice;
      }
      if (newTaskPrice) {
        if (newTaskCurrency == "UYU") {
          task.customer.debtUyu = task.customer.debtUyu + newTaskPrice;
          console.log("work UYU");
        } else {
          task.customer.debtUsd = task.customer.debtUsd + newTaskPrice;
          console.log("work USD");
        }
      }
      await task.customer.save();
    });

  res.status(StatusCodes.OK).json({ check, newTask });
});

const deleteCheck = asyncWrapper(async (req, res) => {
  const { id: checkId } = req.params;
  const { id: taskId } = req.body.taskId;
  await Task.findOne({ _id: taskId })
    .populate("customer")
    .exec(async function (err, task) {
      if (err) return new NotFoundError(err);
      if (!task) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ msg: `No task with id : ${taskId}` });
      }
      let taskPrice = await task.price;
      const taskCurrency = await task.currency;
      const type = await task.type;
      if (type == "payment") {
        taskPrice = -1 * taskPrice;
      }
      if (taskPrice) {
        if (taskCurrency == "UYU") {
          task.customer.debtUyu = task.customer.debtUyu - taskPrice;
        } else {
          task.customer.debtUsd = task.customer.debtUsd - taskPrice;
        }
      }
      const customerTaskIndex = task.customer.tasks.indexOf(task._id);
      task.customer.tasks.splice(customerTaskIndex, 1);
      const customerCheckIndex = task.customer.checks.indexOf(task.check);
      task.customer.checks.splice(customerCheckIndex, 1);
      await task.customer.save();

      Task.findOneAndDelete({ _id: taskId })
        .populate("createdBy")
        .exec(async function (err, task) {
          if (err) return new NotFoundError(err);
          const userTaskIndex = task.createdBy.tasks.indexOf(task._id);
          task.createdBy.tasks.splice(userTaskIndex, 1);
          const userCheckIndex = task.createdBy.checks.indexOf(task.check);
          task.createdBy.checks.splice(userCheckIndex, 1);
          await task.createdBy.save();
        });
      await Check.findOneAndDelete({ _id: checkId });

      await res.status(StatusCodes.OK).send("Check deleted");
    });
});

module.exports = {
  getAllChecks,
  getCheck,
  createCheck,
  updateCheck,
  deleteCheck,
};
