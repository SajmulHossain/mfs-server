const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const cookieParser = require("cookie-parser");

const { ObjectId } = mongoose.Types;

const app = express();
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://ph-mfs.vercel.app",
      "http://192.168.0.105:5173",
    ],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);
app.use(express.json());
app.use(cookieParser());
const port = process.env.PORT || 3000;

const User = require("./schema/userSchema");
const Transactions = require("./schema/transactionSchema");
const Notifications = require("./schema/notificationSchema");

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.saftd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

mongoose.connect(uri).then(() => {
  console.log("Mongoose connected successfully");
});

// * isExist user common function
const isExist = async (query) => {
  const result = await User.findOne(query);
  return result;
};

const verifyToken = async (req, res, next) => {
  const token = req?.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized access" });
    }

    req.user = decoded;
    next();
  });
};

const verifyAdmin = async (req, res, next) => {
  const email = req?.user?.email;
  const user = await User.findOne({ email });
  if (!user || user?.role !== "admin") {
    return res
      .status(403)
      .send({ message: "Access Forbidden! Only Admin Can Access." });
  }

  next();
};
const verifyAgent = async (req, res, next) => {
  const email = req?.user?.email;
  const user = await User.findOne({ email });
  if (!user || user?.role !== "agent") {
    return res
      .status(403)
      .send({ message: "Access Forbidden! Only Agent Can Access." });
  }

  next();
};

// login or jwt
app.post("/jwt", async (req, res) => {
  const { auths, pin } = req.body;

  let isSuccessful = false;

  const user = await User.findOne({
    $or: [{ email: auths }, { number: auths }],
  });

  if (user) {
    isSuccessful = await bcrypt.compare(pin, user.pin);
    if (!isSuccessful) {
      return res.status(401).send({ message: "Wrong Credentials" });
    }
  }

  const token = jwt.sign(
    { email: user?.email, number: user?.number },
    process.env.SECRET_KEY,
    { expiresIn: "12h" }
  );

  res
    .cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    })
    .send({ success: true, role: user?.role, user });
});

// logout
app.get("/logout", async (req, res) => {
  res
    .clearCookie("token", {
      maxAge: 0,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    })
    .send({ success: true });
});

// create user
app.post("/users", async (req, res) => {
  const { pin, email, number, nid, role, name } = req.body;

  try {
    const isExistEmail = await User.findOne({ email });

    if (isExistEmail) {
      return res.status(400).send({ message: "Email already exist" });
    }

    const encodePin = await bcrypt.hash(pin, 10);

    let balance = 0,
      agentStatus = "N/A";

    if (role === "user") {
      balance = 40;
    } else if (role === "agent") {
      balance = 100000;
      agentStatus = "pending";
    }

    const result = new User({
      pin: encodePin,
      email,
      number,
      nid,
      role,
      name,
      balance,
      isDisabled: false,
      agentStatus,
      income: 0,
    });

    await result.save();

    res.send({ success: true, user: result });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// check if token user is valid
app.get("/user", verifyToken, async (req, res) => {
  const user = req.user;
  const isExist = await User.findOne({ email: user?.email });
  if (isExist) {
    res.send({
      success: true,
      user: isExist,
      role: isExist?.role,
      isDisabled: isExist?.isDisabled,
    });
  } else {
    res.status(401).send({ success: false });
  }
});

//  get all user for admin
app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
  const { search } = req.query;
  const result = await User.find({
    $or: [{ role: "user" }, { role: "agent" }],
    number: { $regex: search, $options: "i" },
  });
  res.send(result);
});

// get all agent request for admin
app.get("/agent-requests", verifyToken, verifyAdmin, async (req, res) => {
  const query = { agentStatus: "pending" };
  const result = await User.find(query);
  res.send(result);
});

// accept or reject agent request
app.patch("/agent-status/:id", verifyToken, verifyAdmin, async (req, res) => {
  const { agentStatus } = req.body;
  const { id } = req.params;
  const query = { _id: new ObjectId(id) };
  console.log(agentStatus);
  const updatedStatus = {
    $set: { agentStatus },
  };
  const result = await User.updateOne(query, updatedStatus);
  res.send(result);
});

// cash in
app.patch("/cash-in", verifyToken, verifyAgent, async (req, res) => {
  try {
    const { email } = req.user;
    const agent = await isExist({ email });

    const { amount, pin, number } = req.body;
    if (agent?.balance < amount) {
      return res.status(400).send({ message: "Insufficient Balance!" });
    }

    const checkPIN = await bcrypt.compare(pin, agent?.pin);

    if (!checkPIN) {
      return res.send(400).message({ message: "Wrong PIN" });
    }

    const user = await isExist({ number });
    if (!user) {
      return res.status(400).send({ message: "User does not exist!" });
    }

    if (user?.role !== "user") {
      return res
        .status(400)
        .send({ message: "Admin or Agent cannot cash in!" });
    }

    await User.updateOne({ number }, { $inc: { balance: amount } });
    await User.updateOne({ email }, { $inc: { balance: -amount } });

    const transction = new Transactions({
      userNumber: number,
      agentNumber: agent?.number,
      type: "cash in",
      amount,
    });

    await transction.save();

    const notification = new Notifications({
      id: number,
      message: `${amount} taka cash in successfull`,
    });

    await notification.save();

    res.send({ success: true });
  } catch (err) {
    return res.status(400).send({ message: err.message });
  }
});

// * cash out api
app.patch("/cash-out", verifyToken, async (req, res) => {
  try {
    const { email } = req.user;
    const user = await isExist({ email });

    const { amount, pin, number } = req.body;

    const totalCost = +amount + amount * 0.015;

    if (user?.balance < totalCost) {
      return res.status(400).send({ message: "Insufficient Balance!" });
    }

    const checkPIN = await bcrypt.compare(pin, user?.pin);

    if (!checkPIN) {
      return res.send(400).message({ message: "Wrong PIN" });
    }

    const agent = await isExist({ number });
    if (!agent) {
      return res.status(400).send({ message: "Agent does not exist!" });
    }

    if (agent?.role !== "agent") {
      return res.status(400).send({ message: "This is not an agent number!" });
    }

    const agentIncome = +amount * 0.01;
    const adminIncome = +amount * 0.005;

    await User.updateOne({ email }, { $inc: { balance: -totalCost } });
    await User.updateOne({ number }, { $inc: { income: agentIncome } });
    await User.updateOne({ role: "admin" }, { $inc: { income: adminIncome } });

    const transction = new Transactions({
      userNumber: req?.user?.number,
      agentNumber: agent?.number,
      type: "cash out",
      amount,
      charge: totalCost - amount,
    });

    await transction.save();

    const userNotification = new Notifications({
      id: req?.user?.number,
      message: `${amount} taka cash out from ${agent?.name}`,
    });

    const agentNotification = new Notifications({
      id: agent?.number,
      message: `You earned ${agentIncome} taka from ${req?.user?.number}. Cashout money: ${amount}`,
    });

    await userNotification.save();
    await agentNotification.save();

    res.send({ success: true });
  } catch (err) {
    return res.status(400).send({ message: err.message });
  }
});

// *balance getting common api
app.get("/balance", verifyToken, async (req, res) => {
  const { email } = req.user;
  const result = await User.findOne({ email });
  res.send({ balance: result?.balance });
});

// * notification getting api
app.get("/notifications", verifyToken, async (req, res) => {
  const { number } = req.user;
  const result = await Notifications.find({ id: number }).sort({
    timeStamp: -1,
  });
  res.send(result);
});

// *transaction getting api
app.get("/transactions", verifyToken, async (req, res) => {
  const { number } = req.user;
  const result = await Transactions.find({
    $or: [{ agentNumber: number }, { userNumber: number }],
  });
  res.send(result);
});

app.get("/", (req, res) => {
  res.send("iCash server is running!");
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
