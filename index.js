const express = require("express");

const app = express();
const port = process.env.PORT || 5000;

// main api
app.use("/", (req, res) => {
  res
    .status(200)
    .send({ success: true, message: "Orbit Tools ltd (server running...)" });
});

// Listening
app.listen(port, () => {
  console.log("Running on port: ", port);
});
