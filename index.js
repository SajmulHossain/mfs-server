const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);
app.use(express.json());
const port = process.env.PORT || 3000;

const User = require('./schema/userSchema');

const uri =
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.saftd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

mongoose.connect(uri)
.then(() => {
  console.log('Mongoose connected successfully');
})

app.post('/users', async(req, res) => {
  const {pin, email, number, nid, role, name} = req.body;

  try {
    const isExistEmail = await User.findOne({email});

    if(isExistEmail) {
      return res.status(400).send({message: 'Email already exist'});
    }

    const encodePin = await bcrypt.hash(pin, 10);

    let balance = 0;

    if(role === 'user') {
      balance = 40;
    } else if(role === 'agent') {
      balance = 100000;
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
    });

    await result.save();

    res.send({success: true, user: result});

    
    
  } catch (err) {
    res.send({error: err.message})
  }

})




app.get("/", (req, res) => {
  res.send("PH MFS server is running!");
})

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
})