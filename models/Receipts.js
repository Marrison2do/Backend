const mongoose = require("mongoose");

const ReceiptSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Types.ObjectId,
      ref: "Company",
      required: [true, "Ingrese Empresa"],
    },
    description: {
      type: String,
      maxlength: 100,
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
    price: {
      type: Number,
      required: [true, "Ingrese Precio"],
    },
    color: {
      type: String,
      enum: ["white", "blue", "green", "yellow", "purple"],
      default: "white",
    },
    currency: {
      type: String,
      enum: ["UYU", "USD"],
      required: [true, "Ingrese Moneda"],
    },
    legalDate: {
      type: Date,
      required: [true, "Ingrese Fecha de Emisión"],
    },
    invoices: [
      {
        type: mongoose.Types.ObjectId,
        ref: "Invoice",
      },
    ],
    invoiceType: {
      type: String,
      default: "receipt",
    },
    invoicesPrices: [
      {
        type: Number,
      },
    ],
    set: {
      type: String,
    },
    number: {
      type: Number,
      required: [true, "Ingrese Número de Recibo"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Receipt", ReceiptSchema);
