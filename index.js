const express = require('express');

const app = express()

const port = process.env.PORT || 3000;



app.get("/", (req, res) => {
  res.send("PH MFS server is running!");
})

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
})