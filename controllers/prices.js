const Price = require("../models/Prices");
const User = require("../models/User");
const asyncWrapper = require("../middleware/async");
const { StatusCodes } = require("http-status-codes");

const getAllPrices = asyncWrapper(async (req, res) => {
  const {
    name,
    createdBy,
    newerThan,
    olderThan,
    newerUpdateThan,
    olderUpdateThan,
    supplier,
    numericFilters,
    unit,
    sort,
    pack,
    currency,
    noPrice,
    noCost,
  } = req.query;
  const page = req.query.page || 1;
  const pageSize = req.query.pageSize || 50;

  const startIndex = (page - 1) * pageSize;
  const endIndex = page * pageSize;

  const queryObject = {};
  if (name) {
    queryObject.name = { $regex: name, $options: "i" };
  }
  if (pack) {
    queryObject.pack = { $regex: pack, $options: "i" };
  }
  if (supplier) {
    queryObject.supplier = { $regex: supplier, $options: "i" };
  }
  if (unit) {
    queryObject.unit = unit;
  }
  if (currency) {
    queryObject.currency = currency;
  }
  if (createdBy) {
    const idUser = await User.find({
      name: { $regex: createdBy, $options: "i" },
    });
    queryObject.createdBy = idUser;
  }
  if (noPrice) {
    queryObject.price = undefined;
  }
  if (noCost) {
    queryObject.cost = undefined;
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
    const options = ["price", "cost"];
    filters = filters.split(",").forEach((item) => {
      const [field, operator, value] = item.split("-");
      if (options.includes(field)) {
        queryObject[field] = { [operator]: Number(value) };
      }
    });
  }

  let result = Price.find(queryObject);
  if (sort) {
    const sortList = sort.split(",").join(" ");
    result = result.sort(sortList);
  } else {
    result = result.sort("pack");
  }

  const list = await result;

  const paginatedList = list.slice(startIndex, endIndex);
  const totalPages = Math.ceil(list.length / pageSize);

  res
    .status(StatusCodes.OK)
    .json({ list: paginatedList, totalPages, nbHits: list.length });
});
const getPrice = asyncWrapper(async (req, res) => {
  const { id: priceId } = req.params;
  await Price.findOne({ _id: priceId })
    .populate("createdBy", "name")
    .populate("updatedBy", "name")
    .exec(async function (err, price) {
      if (err)
        return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
      if (!price) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ msg: `No Hay Cliente con el ID : ${priceId}` });
      }
      res.status(StatusCodes.OK).json(price);
    });
});
const createPrice = asyncWrapper(async (req, res) => {
  req.body.createdBy = req.user.userId;
  const price = await Price.create(req.body);

  res.status(StatusCodes.CREATED).json({ price });
});
const createBulkPrices = asyncWrapper(async (req, res) => {
  req.body.createdBy = req.user.userId;
  const priceList = req.body.priceList;
  for (let i = 0; i < priceList.length; i++) {
    await Price.create({
      createdBy: req.user.userId,
      name: priceList[i].name,
      unit: priceList[i].unit,
      supplier: priceList[i].supplier,
      pack: priceList[i].pack,
      price: priceList[i].price,
      cost: priceList[i].cost,
      currency: priceList[i].currency,
    });
  }

  res.status(StatusCodes.CREATED).json({ priceList });
});

const updatePrice = asyncWrapper(async (req, res) => {
  const { id: priceId } = req.params;
  req.body.updatedBy = req.user.userId;
  await Price.findOneAndUpdate({ _id: priceId }, req.body, {
    new: true,
    runValidators: true,
  });
  const price = await Price.findOne({ _id: priceId });
  if (!price) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ msg: `No Hay Articulo con el ID : ${priceId}` });
  }

  res.status(StatusCodes.OK).json(price);
});

const deletePrice = asyncWrapper(async (req, res) => {
  const { id: priceId } = req.params;
  await Price.findOneAndDelete({ _id: priceId }).exec(async function (
    err,
    price
  ) {
    if (err)
      return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
    if (!price) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ msg: `No Hay Articulo con el ID : ${priceId}` });
    }
    res.status(StatusCodes.OK).json(price);
  });
});

module.exports = {
  getAllPrices,
  getPrice,
  createPrice,
  createBulkPrices,
  updatePrice,
  deletePrice,
};
