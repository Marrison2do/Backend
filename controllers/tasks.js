const Task = require("../models/Tasks");
const User = require("../models/User");
const asyncWrapper = require("../middleware/async");
const { StatusCodes } = require("http-status-codes");
const { BadRequestError, NotFoundError } = require("../errors");
const Customer = require("../models/Customers");

const getAllTasks = asyncWrapper(async (req, res) => {
  const {
    description,
    noPrice,
    customer,
    sort,
    createdBy,
    archive,
    updatedBy,
    newerThan,
    olderThan,
    check,
    currency,
    type,
    numericFilters,
  } = req.query;
  const queryObject = {};
  const rank = req.user.rank;
  if (rank !== "admin") {
    queryObject.adminRank = false;
  }
  if (description) {
    queryObject.description = { $regex: description, $options: "i" };
  }
  if (archive) {
    queryObject.archive = archive;
  }

  if (currency) {
    queryObject.currency = currency;
  }
  if (type) {
    queryObject.type = type;
  }
  if (check) {
    queryObject.description = { $regex: "cheque", $options: "i" };
  }
  if (noPrice) {
    queryObject.price = undefined;
  }
  if (customer) {
    const idCustomer = await Customer.findOne({
      name: { $regex: customer, $options: "i" },
    });
    queryObject.customer = idCustomer._id;
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
    const options = ["price"];
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
    customer: 1,
    createdAt: 1,
    type: 1,
    archive: 1,
    currency: 1,
  };

  let result = Task.find(queryObject, projection).populate("customer", "name");
  if (sort) {
    const sortList = sort.split(",").join(" ");
    result = result.sort(sortList);
  } else {
    result = result.sort("createdAt");
  }

  const list = await result;
  res.status(StatusCodes.OK).json({ list, nbHits: list.length });
});

const getTask = asyncWrapper(async (req, res) => {
  const { id: taskId } = req.params;
  const rank = req.user.rank;
  if (rank !== "admin") {
    var query = { _id: taskId, adminRank: false };
  } else {
    var query = { _id: taskId };
  }

  await Task.findOne(query)
    .populate("customer", "name")
    .populate("createdBy", "name")
    .populate("updatedBy", "name")
    .exec(async function (err, task) {
      if (err) return new NotFoundError(err);
      if (!task) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ msg: `No Hay Tareas con el ID : ${taskId}` });
      }
      res.status(StatusCodes.OK).json(task);
    });
});

const createTask = asyncWrapper(async (req, res) => {
  req.body.createdBy = req.user.userId;
  const task = await Task.create(req.body);
  const taskId = await task._id;
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
      await task.customer.save();
    });
  Task.findOne({ _id: taskId })
    .populate("createdBy")
    .exec(async function (err, task) {
      if (err) return new NotFoundError(err);
      task.createdBy.tasks.push(taskId);
      await task.createdBy.save();
    });
  res.status(StatusCodes.CREATED).json({ task });
});

const updateTask = asyncWrapper(async (req, res) => {
  const { id: taskId } = req.params;
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
          .json({ msg: `No Hay Tareas con el ID : ${taskId}` });
      }
      console.log("old");
      console.log(task);

      if (type == "payment") {
        taskPrice = -1 * taskPrice;
      }
      if (taskPrice) {
        if (taskCurrency == "UYU") {
          task.customer.debtUyu = task.customer.debtUyu - taskPrice;
          console.log("old UYU");
        } else {
          task.customer.debtUsd = task.customer.debtUsd - taskPrice;
          console.log("old USD");
        }
      }
      await task.customer.save();
    });

  req.body.updatedBy = req.user.userId;
  await Task.findOneAndUpdate({ _id: taskId }, req.body, {
    new: true,
    runValidators: true,
  });
  const newTask = await Task.findOne({ _id: taskId });
  let newTaskPrice = await newTask.price;
  const newTaskCurrency = await newTask.currency;
  const newType = await newTask.type;
  Task.findOne({ _id: taskId })
    .populate("customer")
    .exec(async function (err, task) {
      if (err) return new NotFoundError(err);
      if (newType == "payment") {
        taskPrice = -1 * taskPrice;
      }
      if (newTaskPrice) {
        if (newTaskCurrency == "UYU") {
          task.customer.debtUyu = task.customer.debtUyu + newTaskPrice;
          console.log("new UYU");
        } else {
          task.customer.debtUsd = task.customer.debtUsd + newTaskPrice;
          console.log("new USD");
        }
      }
      await task.customer.save();
    });

  res.status(StatusCodes.OK).json({ newTask });
});

const deleteTask = asyncWrapper(async (req, res) => {
  const { id: taskId } = req.params;
  const task = await Task.findOne({ _id: taskId })
    .populate("customer")
    .exec(async function (err, task) {
      if (err) return new NotFoundError(err);
      if (!task) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ msg: `No Hay Tareas con el ID : ${taskId}` });
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
      const customerIndex = task.customer.tasks.indexOf(task._id);
      task.customer.tasks.splice(customerIndex, 1);
      await task.customer.save();
    });
  Task.findOneAndDelete({ _id: taskId })
    .populate("createdBy")
    .exec(async function (err, task) {
      if (err) return new NotFoundError(err);
      const userIndex = task.createdBy.tasks.indexOf(task._id);
      task.createdBy.tasks.splice(userIndex, 1);
      await task.createdBy.save();
    });

  res.status(StatusCodes.OK).json({ task });
});

module.exports = {
  getAllTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
};
