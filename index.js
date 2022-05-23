const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const cors = require("cors");

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// default gateway api
app.use("/", (req, res) => {
  res
    .status(200)
    .send({ success: true, message: "Orbit Tools ltd (server running...)" });
});


// mongoDB configuration
const uri =`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.me65q.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1
});

async function run() {
  try {
    await client.connect();
    const database = client.db("orbit_tools");
    const productsCollection = database.collection("products");
    console.log("database connected");

    // getting all services
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

// Listening
app.listen(port, () => {
  console.log("Running on port: ", port);
});
