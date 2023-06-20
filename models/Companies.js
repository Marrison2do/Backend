const mongoose = require("mongoose");

const CompanySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      maxlength: 50,
      required: [true, "Ingrese Nombre"],
    },
    rut: {
      type: Number,
      maxlength: 12,
      minlength: 12,
      required: [true, "Ingrese RUT"],
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: [true, "Ingrese Usuario"],
    },
    customer: {
      type: mongoose.Types.ObjectId,
      ref: "Customer",
      required: [true, "Ingrese Cliente"],
    },
    invoices: [
      {
        type: mongoose.Types.ObjectId,
        ref: "Invoice",
      },
    ],
    receipts: [
      {
        type: mongoose.Types.ObjectId,
        ref: "Receipt",
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
    description: {
      type: String,
      maxlength: 50,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Company", CompanySchema);
