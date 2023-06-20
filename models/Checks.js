const mongoose = require("mongoose");

const CheckSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      maxlength: 100,
    },
    price: {
      type: Number,
      required: [true, "Ingrese Precio"],
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
    currency: {
      type: String,
      enum: ["UYU", "USD"],
      required: [true, "Ingrese Moneda"],
    },
    task: {
      type: mongoose.Types.ObjectId,
      ref: "Task",
      required: [true, "Ingrese Tarea"],
    },
    bank: {
      type: String,
      required: [true, "Ingrese Banco"],
    },
    set: {
      type: String,
      required: [true, "Ingrese Serie de Cheque"],
    },
    number: {
      type: Number,
      required: [true, "Ingrese Numero de Cheque"],
    },
    paymentDate: {
      type: Date,
      required: [true, "Ingrese Fecha de Cobro del Cheque"],
    },
    adminRank: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Check", CheckSchema);
