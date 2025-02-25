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

const verifyToken = async(req, res, next) => {
  const token = req?.cookies?.token;

  if(!token) {
    return res.send(401).send({message: 'Unauthorized Access'});
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if(err) {
      return res.status(401).send({message: 'Unauthorized access'})
    }

    req.user = decoded;
    next();
  })
}

app.post('/jwt', async(req, res) => {
  const {auths, pin} = req.body;

    let isSuccessful = false;

    const user = await User.findOne({
      $or: [{email: auths}, {number: auths}],
    })

    if(user) {
      isSuccessful = await bcrypt.compare(pin, user.pin);
      if(!isSuccessful) {
        return res.status(401).send({message: 'Wrong Credentials'});
      }
    }

    const token = jwt.sign({email: user?.email, number: user?.number}, process.env.SECRET_KEY, {expiresIn: '12h'})
    

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      maxAge: '2h'
    }).send({success: true, role: user?.role, user})
})

app.get('/logout', async(req, res) => {
  res.clearCookie("token", {
    maxAge: 0,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  })
  .send({success: true});
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
    res.status(500).send({error: err.message})
  }
})

 app.get("/user", verifyToken, async (req, res) => {
   const user = req.user;
   const isExist = await User.findOne({ email: user?.email });
   if (isExist) {
     res.send({ success: true, user: isExist });
   } else {
     res.status(401).send({ success: false });
   }
 });






app.get("/", (req, res) => {
  res.send("PH MFS server is running!");
})

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
})