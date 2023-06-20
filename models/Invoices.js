const mongoose = require("mongoose");

const InvoiceSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      maxlength: 100,
    },
    price: {
      type: Number,
      required: [true, "Please provide price"],
    },
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
    receipt: { type: mongoose.Types.ObjectId, ref: "Receipt" },
    currency: {
      type: String,
      enum: ["UYU", "USD"],
      required: [true, "Please provide currency"],
    },
    legalDate: {
      type: Date,
      required: [true, "Please provide date"],
    },
    serial: {
      type: Number,
      required: [true, "Please provide serial"],
    },
    invoiceType: {
      type: String,
      enum: ["e-invoice", "creditMemo", "e-ticket"],
      required: [true, "Please provide invoice type"],
    },
    payed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", InvoiceSchema);
