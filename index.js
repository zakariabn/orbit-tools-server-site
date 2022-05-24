const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const orderCollection = database.collection("orders");
    const reviewCollection = database.collection("reviews");
    console.log("database connected");

    // verify admin
    async function verifyAdmin(req, res, next) {
      const email = req.query.email;
      const user = await userCollection.findOne({ email: email });
      if (user) {
        if (user.role === "admin") {
          next();
        } else {
          res.send(403).send({ message: "forbidden access" });
        }
      }
    }
    // getting all user
    app.get("/users", async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send({ success: true, users });
    });

    // getting single user
    app.get("/user/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      res.send({ success: true, user });
    });

    // creating and verifying user and giving jwt token.
    app.put("/user/:email", async (req, res) => {
      console.log("create user api hit");
      const user = req.body;
      const email = req.params.email;

      // handling user role replace
      const selectedUser = await userCollection.findOne({ email: email });
      if (selectedUser?.role) {
        user.role = selectedUser.role;
      }

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

    // checking admin user
    app.get("/user/admin", async (req, res) => {
      console.log("checking admin");
      const email = req.query.email;
      try {
        const user = await userCollection.findOne({ email: email });
        if (user) {
          if (user.role === "admin") {
            res.send({ admin: true });
          } else {
            res.send({ admin: false });
          }
        }
      } catch (error) {
        res.send({ admin: false });
      }
    });

    // logout user
    app.get("/user/logout", (req, res) => {
      res
        .clearCookie("accessToken")
        .status(200)
        .send({ message: "logout successful" });
    });

    // getting all services
    app.get("/products", async (req, res) => {
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

    // getting single product by id
    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: ObjectId(id) };
      const product = await productCollection.findOne(query);
      res.send({ success: true, product });
    });

    // adding a order
    app.post("/order", verifyToken, async (req, res) => {
      console.log("New order");

      const order = req.body.orderData;
      const id = req.query.productId;
      const orderQuantity = parseInt(req.query.quantity);

      const product = await productCollection.findOne({ _id: ObjectId(id) });

      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          availableQuantity:
            parseInt(product.availableQuantity) - orderQuantity,
        },
      };
      const options = { upsert: true };
      const updateProduct = await productCollection.updateOne(
        filter,
        updateDoc,
        options
      );

      if (updateProduct.modifiedCount === 1) {
        const result = await orderCollection.insertOne(order);
        res.status(200).send({ success: true, result });
      } else {
        res.send({ success: false, message: "Product stock update failed" });
      }
    });

    // getting orders
    app.get("/orders", async (req, res) => {
      const email = req.query.email;

      let orders;
      if (email) {
        orders = await orderCollection.find({ userEmail: email }).toArray();
      } else {
        orders = await orderCollection.find().toArray();
      }

      if (orders) {
        res.status(200).send({ success: true, orders });
      } else {
        res.send({ success: false, message: "order not found" });
      }
    });

    // adding a review
    app.post('/add/review', (req, res) => {
      const review = req.body.reviewData;
      console.log(review);

      const result = reviewCollection.insertOne(review);

      if (result) {
        res.status(200).send({success: true, message: "Added a review"})
      }
    })

    // getting review
    app.get("/review", async (req, res) => {
      console.log("Getting review");

      const limit = parseInt(req.query.limit);
      const isValidLimit = /^\d+$/.test(limit);

      let review;
      if (isValidLimit) {
        review = await reviewCollection.find({}).limit(limit).toArray();
      } else {
        review = await reviewCollection.find({}).toArray();
      }

      res.send({ success: true, review});
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
