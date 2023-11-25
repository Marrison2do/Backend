const mongoose = require("mongoose");

const GlobalSchema = new mongoose.Schema({
  name: {
    type: String,
    maxlength: 20,
  },
  data: {
    type: Object,
  },
});

module.exports = mongoose.model("Global", GlobalSchema);
