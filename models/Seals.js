const mongoose = require("mongoose");

const SealSchema = new mongoose.Schema(
  {
    size: {
      type: String,
      maxlength: 80,
      required: [true, "Ingrese Medida"],
    },
    code: {
      type: Number,
      required: [true, "Ingrese Codigo"],
      unique: [true, "Código Existente"],
    },
    type: { type: String, maxlength: 20 },
    price: { type: Number, required: [true, "Ingrese Precio"] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Seal", SealSchema);
