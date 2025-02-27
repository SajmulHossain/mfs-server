const mongoose = require("mongoose");

const withdrawSchema = new mongoose.Schema({
  agentNumber: {
    type: String,
    required: true,
  },

  name: {
    type: String,
    required: true,
  },

  timeStamp: {
    type: Date,
    required: true,
    default: Date.now,
  },

  status: {
    type: String,
    required: true,
    enum: ["pending", "apporved", "rejected"],
    default: "pending",
  },

  amount: {
    type: Number,
    required: true,
  },
});

const Withdraws = mongoose.model("Withdraws", withdrawSchema);
module.exports = Withdraws;
