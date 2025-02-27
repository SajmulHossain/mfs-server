const mongoose = require("mongoose");

const moneyRequestSchema = new mongoose.Schema({
  agentNumber: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
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
});

const MoneyRequests = new mongoose.model("MoneyRequests", moneyRequestSchema);

module.exports = MoneyRequests;