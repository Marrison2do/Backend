const mongoose = require("mongoose");

const ReceiptSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Types.ObjectId,
      ref: "Company",
      required: [true, "Please provide company"],
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
    price: {
      type: Number,
      required: [true, "Please provide price"],
    },
    currency: {
      type: String,
      enum: ["UYU", "USD"],
      required: [true, "Please provide currency"],
    },
    legalDate: {
      type: Date,
      required: [true, "Please provide date"],
    },
    invoices: [
      {
        type: mongoose.Types.ObjectId,
        ref: "Invoice",
      },
    ],
    invoicesPrices: [
      {
        type: Number,
        required: [true, "Please provide price of the invoices"],
      },
    ],
    set: {
      type: String,
      required: [true, "Please provide set"],
    },
    number: {
      type: Number,
      required: [true, "Please provide number"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Receipt", ReceiptSchema);
