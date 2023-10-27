const { boolean, required } = require("joi");
const mongoose = require("mongoose");

const CustomerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      maxlength: 50,
      required: [true, "Ingrese Nombre"],
    },
    phoneNumber: {
      type: String,
      maxlength: 50,
    },
    description: {
      type: String,
      maxlength: 50,
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: [true, "Ingrese Usuario"],
    },
    color: {
      type: String,
      enum: ["white", "blue", "green", "yellow", "purple"],
      default: "white",
    },
    tasks: [
      {
        type: mongoose.Types.ObjectId,
        ref: "Task",
      },
    ],
    company: {
      type: mongoose.Types.ObjectId,
      ref: "Company",
    },
    checks: [
      {
        type: mongoose.Types.ObjectId,
        ref: "Check",
      },
    ],
    debtUyu: {
      type: Number,
      default: 0,
    },
    debtUsd: {
      type: Number,
      default: 0,
    },
    adminRank: {
      type: Boolean,
      default: false,
    },
    archive: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", CustomerSchema);
