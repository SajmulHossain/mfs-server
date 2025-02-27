const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  pin: {
    type: String,
    required: true,
    unique: true
  },

  role: {
    type: String,
    required: true,
    enum: ["user", "agent"],
  },

  balance: Number,
  number: {
    type: String,
    required: true,
    unique: true,
  },

  nid: {
    type: Number,
    required: true,
    unique: true
  },

  isDisabled: {
    type: Boolean,
    default: false,
  },
  
  email: {
    type: String,
    required: true,
    unique: true,
  },

  agentStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },

  income: {
    type: Number,
    default: 0
  },

  isLoggedIn : {
    type: Boolean,
    required: true,
    default: false,
  }
  
})

const User = new mongoose.model("User", userSchema);

module.exports = User;