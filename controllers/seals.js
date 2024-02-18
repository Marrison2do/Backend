const Seal = require("../models/Seals");
const User = require("../models/User");
const asyncWrapper = require("../middleware/async");
const { StatusCodes } = require("http-status-codes");

const getAllSeals = asyncWrapper(async (req, res) => {
  const {
    size,
    code,
    createdBy,
    newerThan,
    olderThan,
    newerUpdateThan,
    olderUpdateThan,
    numericFilters,
    sort,
    pack,
    noPrice,
    page,
    pageSize,
  } = req.query;
  const startIndex = (page - 1) * pageSize;
  const endIndex = page * pageSize;
  const queryObject = {};
  if (size) {
    queryObject.size = { $regex: size, $options: "i" };
  }
  if (code) {
    queryObject.code = code;
  }
  if (pack) {
    queryObject.pack = { $regex: pack, $options: "i" };
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
    const options = ["price", "code"];
    filters = filters.split(",").forEach((item) => {
      const [field, operator, value] = item.split("-");
      if (options.includes(field)) {
        queryObject[field] = { [operator]: Number(value) };
      }
    });
  }

  let result = Seal.find(queryObject);
  if (sort) {
    const sortList = sort.split(",").join(" ");
    result = result.sort(sortList);
  } else {
    result = result.sort("code");
  }

  const list = await result;
  const totalPages = Math.ceil(list.length / pageSize);
  const paginatedList = list.slice(startIndex, endIndex);

  res
    .status(StatusCodes.OK)
    .json({ list: paginatedList, totalPages, nbHits: list.length });
});
const getSeal = asyncWrapper(async (req, res) => {
  const { id: sealId } = req.params;
  await Seal.findOne({ _id: sealId })
    .populate("createdBy", "name")
    .populate("updatedBy", "name")
    .exec(async function (err, seal) {
      if (err)
        return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
      if (!seal) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ msg: `No Hay Cliente con el ID : ${sealId}` });
      }
      res.status(StatusCodes.OK).json(seal);
    });
});
const createSeal = asyncWrapper(async (req, res) => {
  req.body.createdBy = req.user.userId;
  const seal = await Seal.create(req.body);

  res.status(StatusCodes.CREATED).json({ seal });
});
const createBulkSeals = asyncWrapper(async (req, res) => {
  req.body.createdBy = req.user.userId;
  const sealList = req.body.sealList;
  for (let i = 0; i < sealList.length; i++) {
    await Seal.create({
      createdBy: req.user.userId,
      code: sealList[i].code,
      size: sealList[i].size,
      pack: sealList[i].pack,
      price: sealList[i].price,
    });
  }

  res.status(StatusCodes.CREATED).json({ sealList });
});

const updateSeal = asyncWrapper(async (req, res) => {
  const { id: sealId } = req.params;
  req.body.updatedBy = req.user.userId;
  await Seal.findOneAndUpdate({ _id: sealId }, req.body, {
    new: true,
    runValidators: true,
  });
  const seal = await Seal.findOne({ _id: sealId });
  if (!seal) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ msg: `No Hay Articulo con el ID : ${sealId}` });
  }

  res.status(StatusCodes.OK).json(seal);
});

const deleteSeal = asyncWrapper(async (req, res) => {
  const { id: sealId } = req.params;
  await Seal.findOneAndDelete({ _id: sealId }).exec(async function (err, seal) {
    if (err)
      return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
    if (!seal) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ msg: `No Hay Articulo con el ID : ${sealId}` });
    }
    res.status(StatusCodes.OK).json(seal);
  });
});

module.exports = {
  getAllSeals,
  getSeal,
  createSeal,
  createBulkSeals,
  updateSeal,
  deleteSeal,
};
