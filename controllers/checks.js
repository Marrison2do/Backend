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
    payAfter,
    updatedBy,
    set,
    currency,
    numericFilters,
    page,
    pageSize,
  } = req.query;
  const startIndex = (page - 1) * pageSize;
  const endIndex = page * pageSize;
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
  if (payAfter && payBefore) {
    queryObject.paymentDate = {
      $gte: new Date(payAfter),
      $lte: new Date(payBefore),
    };
  }
  if (payAfter && !payBefore) {
    queryObject.paymentDate = { $gte: new Date(payAfter) };
  }
  if (!payAfter && payBefore) {
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
    color: 1,
    createdAt: 1,
  };

  let result = Check.find(queryObject, projection).populate("customer", "name");
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

const getCheck = asyncWrapper(async (req, res) => {
  const { id: checkId } = req.params;
  const rank = req.user.rank;
  if (rank !== "admin") {
    var query = { _id: checkId, adminRank: false };
  } else {
    var query = { _id: checkId };
  }
  await Check.findOne(query)
    .populate("customer", "name")
    .populate("createdBy", "name")
    .populate("updatedBy", "name")
    .exec(async function (err, check) {
      if (err)
        return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
      if (!check) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ msg: `No Hay Cheque con el ID : ${checkId}` });
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
      if (err)
        return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
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
      if (err)
        return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
      task.createdBy.tasks.push(taskId);
      task.createdBy.checks.push(checkId);
      await task.createdBy.save();
    });

  res.status(StatusCodes.CREATED).json({ check, task });
});

const updateCheck = asyncWrapper(async (req, res) => {
  if (!req.body.task) {
    console.log("a");
    const { id: checkId } = req.params;
    const check = await Check.findOneAndUpdate({ _id: checkId }, req.body, {
      new: true,
      runValidators: true,
    });
    console.log(check);
    res.status(StatusCodes.OK).json({ check });
  }
  if (req.body.task) {
    const { id: checkId } = req.params;
    const { _id: taskId } = req.body.task;
    const oldTask = await Task.findOne({ _id: taskId });
    var taskPrice = await oldTask.price;
    const taskCurrency = await oldTask.currency;
    const type = await oldTask.type;
    await Task.findOne({ _id: taskId })
      .populate("customer")
      .exec(async function (err, task) {
        if (err)
          return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
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
        if (err)
          return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
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

    res.status(StatusCodes.OK).json({ check, newTask });
  }
});

const deleteCheck = asyncWrapper(async (req, res) => {
  const { id: checkId } = req.params;
  const { id: taskId } = req.body.taskId;
  await Task.findOne({ _id: taskId })
    .populate("customer")
    .exec(async function (err, task) {
      if (err)
        return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
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
      const customerTaskIndex = task.customer.tasks.indexOf(task._id);
      task.customer.tasks.splice(customerTaskIndex, 1);
      const customerCheckIndex = task.customer.checks.indexOf(task.check);
      task.customer.checks.splice(customerCheckIndex, 1);
      await task.customer.save();

      Task.findOneAndDelete({ _id: taskId })
        .populate("createdBy")
        .exec(async function (err, task) {
          if (err)
            return res
              .status(StatusCodes.NOT_FOUND)
              .json({ msg: `ID Inválida` });
          const userTaskIndex = task.createdBy.tasks.indexOf(task._id);
          task.createdBy.tasks.splice(userTaskIndex, 1);
          const userCheckIndex = task.createdBy.checks.indexOf(task.check);
          task.createdBy.checks.splice(userCheckIndex, 1);
          await task.createdBy.save();
        });
      await Check.findOneAndDelete({ _id: checkId });

      await res.status(StatusCodes.OK).send("Cheque Eliminado Correctamente");
    });
});

module.exports = {
  getAllChecks,
  getCheck,
  createCheck,
  updateCheck,
  deleteCheck,
};
