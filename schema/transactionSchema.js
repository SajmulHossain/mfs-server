const mongoose = require("mongoose");

// * transaction id generator
const generateTransactionId = () => {
  const randomBytes = require("crypto").randomBytes(18).toString("hex");
  const transactionId = `ictx${randomBytes}`;
  return transactionId;
};

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    default: generateTransactionId()
  },

  receiverNumber: {
    type: String,
    required: true,
  },

  agentNumber: {
    type: String,
    required: true,
  },

  timeStamp: {
    type: Date,
    required: true,
    default: Date.now
  },

  type: {
    type: String,
    enum: ['send money', 'cash out', 'cash in'],
    required: true,
  },

  charge: {
    type: Number,
    default: 0
  },

  amount: {
    type: Number,
    required: true,
  }
})

const Transactions = new mongoose.model("Transactions", transactionSchema);

module.exports = Transactions;