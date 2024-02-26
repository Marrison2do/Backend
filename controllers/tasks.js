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
    pack,
    updatedBy,
    newerThan,
    olderThan,
    check,
    currency,
    type,
    numericFilters,
    page,
    pageSize,
  } = req.query;
  const queryObject = {};
  const rank = req.user.rank;
  const startIndex = (page - 1) * pageSize;
  const endIndex = page * pageSize;
  {
    const customerObject = {};
    if (rank !== "admin") {
      customerObject.adminRank = false;
    }
    if (customer) {
      customerObject.name = { $regex: customer, $options: "i" };
    }
    if (!archive) {
      customerObject.archive = false;
    }
    if (archive) {
      customerObject.archive = true;
    }

    const customerList = await Customer.find(customerObject);
    const idMap = customerList.map((customer) => {
      return customer._id;
    });
    queryObject.customer = idMap;
  }
  if (pack) {
    queryObject.pack = { $regex: pack, $options: "i" };
  }

  if (description) {
    queryObject.description = { $regex: description, $options: "i" };
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
    comment: 1,
    pack: 1,
    price: 1,
    customer: 1,
    createdAt: 1,
    type: 1,
    archive: 1,
    currency: 1,
    color: 1,
  };

  let result = Task.find(queryObject, projection).populate("customer", "name");
  if (sort) {
    const sortList = sort.split(",").join(" ");
    result = result.sort(sortList);
  } else {
    result = result.sort("pack");
  }

  const list = await result;
  const totalPages = Math.ceil(list.length / pageSize);
  const paginatedList = list.slice(startIndex, endIndex);

  res
    .status(StatusCodes.OK)
    .json({ list: paginatedList, totalPages, nbHits: list.length });
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
  req.body.createdAt = req.body.createdAt || Date.now();
  req.body.updatedAt = req.body.createdAt || Date.now();
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

  req.body.updatedBy = req.user.userId;
  req.body.updatedAt = Date.now();
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
        newTaskPrice = -1 * newTaskPrice;
      }
      if (newTaskPrice) {
        if (newTaskCurrency == "UYU") {
          task.customer.debtUyu = task.customer.debtUyu + newTaskPrice;
        } else {
          task.customer.debtUsd = task.customer.debtUsd + newTaskPrice;
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
