const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// middleware
// app.use(cors());
app.use(cors({ credentials: true, origin: `${process.env.ORIGIN}` }));

app.use(express.json());
app.use(cookieParser());

// middleware
function verifyToken(req, res, next) {
  const accessToken = req.cookies.accessToken;
  if (!accessToken) {
    return res.status(401).send({ message: "UnAuthorized access" });
  }

  const token = accessToken.split(" ")[1];
  jwt.verify(token, process.env.SECRET_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

// default gateway api
app.get("/", (req, res) => {
  res
    .status(200)
    .send({ success: true, message: "Orbit Tools ltd (server running...)" });
});

// mongoDB configuration
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.me65q.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const database = client.db("orbitTools");
    const userCollection = database.collection("users");
    const productCollection = database.collection("products");
    console.log("database connected");

    // creating and verifying user and giving jwt token.
    app.put("/user/:email", async (req, res) => {
      console.log("create user api hit");
      const user = req.body;
      const email = req.params.email;

      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);

      const token = jwt.sign({ email: email }, process.env.SECRET_TOKEN, {
        expiresIn: "1d",
      });
      res.cookie("accessToken", `Bearer ${token}`, {
        sameSite: "strict",
        expires: new Date(new Date().getTime() + 3600 * 24 * 1000),
        httpOnly: true,
      });
      res.status(200).send({ validUser: true, result, token });
    });

    // logout user
    app.get('/user/logout', (req, res) => {
      res.clearCookie('accessToken').status(200).send({message: "logout successful"})
    })


    // getting all services
    app.get("/products", async (req, res) => {
      console.log(req.cookies);

      console.log("Products hit");
      const limit = parseInt(req.query.limit);
      const isValidLimit = /^\d+$/.test(limit);

      let products;
      if (isValidLimit) {
        products = await productCollection.find({}).limit(limit).toArray();
      } else {
        products = await productCollection.find({}).toArray();
      }

      res.send({ success: true, products });
    });

    app.get("/test", verifyToken, (req, res) => {
      res.send("test");
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

// Listening
app.listen(port, () => {
  console.log("Running on port: ", port);
});
