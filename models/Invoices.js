const mongoose = require("mongoose");

const InvoiceSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      maxlength: 100,
    },
    price: {
      type: Number,
      required: [true, "Ingrese Precio"],
    },
    company: {
      type: mongoose.Types.ObjectId,
      ref: "Company",
      required: [true, "Ingrese Empresa"],
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
    receipt: { type: mongoose.Types.ObjectId, ref: "Receipt" },
    currency: {
      type: String,
      enum: ["UYU", "USD"],
      required: [true, "Ingrese Moneda"],
    },
    legalDate: {
      type: Date,
      required: [true, "Ingrese Fecha de Emisión"],
    },
    serial: {
      type: Number,
      required: [true, "Ingrese Número de Factura"],
    },
    invoiceType: {
      type: String,
      enum: ["e-invoice", "creditMemo", "e-ticket"],
      required: [true, "Ingrese invoice type"],
    },
    payed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", InvoiceSchema);
