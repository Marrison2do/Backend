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
  } = req.query;

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
    const options = ["price"];
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
  res.status(StatusCodes.OK).json({ list, nbHits: list.length });
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
  const price = await Price.create({
    name: req.body.name,
    price: req.body.price,
    unit: req.body.unit,
    supplier: req.body.supplier,
    createdBy: req.body.createdBy,
    currency: req.body.currency,
    pack: req.body.pack,
  });

  res.status(StatusCodes.CREATED).json({ price });
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
  updatePrice,
  deletePrice,
};
