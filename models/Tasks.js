const { boolean, date } = require("joi");
const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: [true, "Ingrese descripción"],
      maxlength: 800,
    },
    comment: {
      type: String,
      maxlength: 100,
    },
    price: {
      type: Number,
    },
    customer: {
      type: mongoose.Types.ObjectId,
      ref: "Customer",
      required: [true, "Ingrese Cliente"],
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: [true, "Ingrese Usuario"],
    },
    updatedBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
    check: { type: mongoose.Types.ObjectId, ref: "Check" },
    currency: {
      type: String,
      enum: ["UYU", "USD"],
      required: [true, "Ingrese Moneda"],
    },

    color: {
      type: String,
      enum: ["white", "blue", "green", "yellow", "purple"],
      default: "white",
    },
    type: {
      type: String,
      enum: ["debt", "payment"],
      default: "debt",
    },
    adminRank: {
      type: Boolean,
      default: false,
    },
    pack: {
      type: String,
      default: "General",
    },
    date: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", TaskSchema);
