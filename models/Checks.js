const mongoose = require("mongoose");

const CheckSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      maxlength: 100,
    },
    price: {
      type: Number,
      required: [true, "Please provide price"],
    },
    customer: {
      type: mongoose.Types.ObjectId,
      ref: "Customer",
      required: [true, "Please provide customer"],
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: [true, "Please provide user"],
    },
    updatedBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
    currency: {
      type: String,
      enum: ["UYU", "USD"],
      required: [true, "Please provide currency"],
    },
    task: {
      type: mongoose.Types.ObjectId,
      ref: "Task",
      required: [true, "Please provide task"],
    },
    bank: {
      type: String,
      required: [true, "Please provide bank"],
    },
    set: {
      type: String,
      required: [true, "Please provide set"],
    },
    number: {
      type: Number,
      required: [true, "Please provide number"],
    },
    paymentDate: {
      type: Date,
      required: [true, "Please rovide payment date"],
    },
    adminRank: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Check", CheckSchema);
