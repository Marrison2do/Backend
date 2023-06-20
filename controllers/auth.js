const User = require("../models/User");
const { StatusCodes } = require("http-status-codes");
const { BadRequestError, UnauthenticatedError } = require("../errors");
const jwt = require("jsonwebtoken");

const register = async (req, res) => {
  // const{name,email,password} = req.body
  // if (!name || !email || !password){
  //     throw new BadRequestError('please provide name, email and pasword')
  // }
  const user = await User.create({ ...req.body });
  const token = user.createJWT();
  res.status(StatusCodes.CREATED).json({ user: { name: user.name }, token });
};

const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    throw new BadRequestError("Ingrese Usuario y Contraseña");
  }
  const user = await User.findOne({ username });

  if (!user) {
    throw new UnauthenticatedError("Usuario y/o Contraseña Incorrectos");
  }

  // compare password
  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    throw new UnauthenticatedError("Usuario y/o Contraseña Incorrectos");
  }

  const token = user.createJWT();
  res.status(StatusCodes.OK).json({ user: { name: user.name }, token });
};

module.exports = { register, login };
