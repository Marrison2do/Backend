const mongoose = require("mongoose");

const PriceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      maxlength: 100,
      required: [true, "Ingrese nombre"],
    },
    price: {
      type: Number,
      required: [true, "Ingrese precio"],
    },
    unit: {
      type: String,
      required: [true, "ingrese unidad"],
      enum: ["Unidad", "Metro", "Metro cuadrado", "Litro"],
    },
    supplier: {
      type: String,
      maxlength: 30,
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
    pack: {
      type: String,
      default: "General",
    },
    currency: {
      type: String,
      enum: ["UYU", "USD"],
      required: [true, "Ingrese Moneda"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Price", PriceSchema);
