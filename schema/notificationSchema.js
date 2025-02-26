const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },

  message: {
    type: String,
    required: true,
  },

  route: String,
  timeStamp: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

const Notifications = new mongoose.model("Notifications", notificationSchema);

module.exports = Notifications;
