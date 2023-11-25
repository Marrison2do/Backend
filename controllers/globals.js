const Global = require("../models/Globals");
const asyncWrapper = require("../middleware/async");
const { StatusCodes } = require("http-status-codes");

const getAllGlobals = asyncWrapper(async (req, res) => {
  const { name } = req.query;
  const queryObject = {};
  if (name) {
    queryObject.name = { $regex: name, $options: "i" };
  }
  let result = Global.find(queryObject);
  const list = await result;
  res.status(StatusCodes.OK).json({ list, nbHits: list.length });
});

const getGlobal = asyncWrapper(async (req, res) => {
  const { id: globalId } = req.params;
  await Global.findOne({ _id: globalId }).exec(async function (err, global) {
    if (err)
      return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
    if (!global) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ msg: `No Hay Variable con el ID : ${globalId}` });
    }
    res.status(StatusCodes.OK).json(global);
  });
});

const createGlobal = asyncWrapper(async (req, res) => {
  const global = await Global.create(req.body);
  res.status(StatusCodes.CREATED).json({ global });
});

const updateGlobal = asyncWrapper(async (req, res) => {
  const { id: globalId } = req.params;
  await Global.findOneAndUpdate({ _id: globalId }, req.body, {
    new: true,
    runValidators: true,
  });
  const global = await Global.findOne({ _id: globalId });
  if (!global) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ msg: `No Hay Variable con el ID : ${globalId}` });
  }

  res.status(StatusCodes.OK).json(global);
});

const deleteGlobal = asyncWrapper(async (req, res) => {
  const { id: globalId } = req.params;
  await Global.findOneAndDelete({ _id: globalId }).exec(async function (
    err,
    global
  ) {
    if (err)
      return res.status(StatusCodes.NOT_FOUND).json({ msg: `ID Inválida` });
    if (!global) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ msg: `No Hay Variable con el ID : ${globalId}` });
    }
    res.status(StatusCodes.OK).json(global);
  });
});

module.exports = {
  getAllGlobals,
  getGlobal,
  createGlobal,
  updateGlobal,
  deleteGlobal,
};
