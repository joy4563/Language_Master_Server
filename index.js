const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// joy
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.p1lnucg.mongodb.net/?retryWrites=true&w=majority`;



// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const usersCollection = client.db("languageMaster").collection("users");
        const adminCollection = client
            .db("languageMaster")
            .collection("requestClasses");
        const selectClassesCollection = client
            .db("languageMaster")
            .collection("selectedClasses");
        const paymentCollection = client
            .db("languageMaster")
            .collection("payments");
        const instructorCollection = client
            .db("languageMaster")
            .collection("instructor");

        // user api

        app.post("/users", async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: "User Already Exists" });
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        app.get("/users", async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        });

        app.patch("/users/admin/:id", async (req, res) => {
            const id = req.params;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: "admin",
                },
            };
            const result = await usersCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });

        app.patch("/users/instructor/:id", async (req, res) => {
            const id = req.params;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: "instructor",
                },
            };
            const result = await usersCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });

        app.delete("/users/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        });

        app.get("/users/specific/admin/:email", async (req, res) => {
            const email = req.params.email;

            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === "admin" };
            res.send(result);
        });

        app.get("/users/specific/instructor/:email", async (req, res) => {
            const email = req.params.email;

            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const result = { instructor: user?.role === "instructor" };
            res.send(result);
        });

        //admin api

        app.post("/admin", async (req, res) => {
            const classes = req.body;
            const result = await adminCollection.insertOne(classes);
            res.send(result);
        });

        app.get("/admin", async (req, res) => {
            const result = await adminCollection.find().toArray();
            res.send(result);
        });

        app.patch("/admin/approved/:id", async (req, res) => {
            const id = req.params;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: "Approved",
                    enrolledNumber: 0,
                },
            };
            const result = await adminCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });

        app.patch("/admin/rejected/:id", async (req, res) => {
            const id = req.params;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: "Rejected",
                },
            };
            const result = await adminCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });

        app.patch("/admin/feedback/:id", async (req, res) => {
            const id = req.params.id;
            const user = req.body;

            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatedUser = {
                $set: {
                    feedback: user.feedback,
                },
            };
            const result = await adminCollection.updateOne(
                filter,
                updatedUser,
                options
            );
            res.send(result);
        });

        app.get("/specific", async (req, res) => {
            let query = {};
            if (req.query?.email) {
                query = { instructorEmail: req.query?.email };
            }
            const result = await adminCollection.find(query).toArray();
            res.send(result);
        });

        //classes
        app.post("/selectedClass", async (req, res) => {
            const selectedClass = req.body;
            const result = await selectClassesCollection.insertOne(
                selectedClass
            );
            res.send(result);
        });

        //user

        app.get("/selectedClass", async (req, res) => {
            let query = {};
            if (req.query?.email) {
                query = { email: req.query?.email };
            }
            const result = await selectClassesCollection.find(query).toArray();
            res.send(result);
        });

        // payment system api

        app.post("/create-payment-intent", async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"],
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        //payment related api

        app.post("/payments", async (req, res) => {
            const paymentInfo = req.body;
            const result = await paymentCollection.insertOne(paymentInfo);
            res.send(result);
        });

        app.get("/payments/specific", async (req, res) => {
            let query = {};
            if (req.query?.email) {
                query = { email: req.query?.email };
            }
            const result = await paymentCollection.find(query).toArray();
            res.send(result);
        });

        app.delete("/payments/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await selectClassesCollection.deleteOne(query);
            res.send(result);
        });

        app.patch("/payments/update/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $inc: {
                    availableSeat: -1,
                    enrolledNumber: 1,
                },
            };
            const result = await adminCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });

        app.get("/payments/history", async (req, res) => {
            let query = {};
            const sort = { date: -1 };
            if (req.query?.email) {
                query = { email: req.query?.email };
            }
            const result = await paymentCollection
                .find(query)
                .sort(sort)
                .toArray();
            res.send(result);
        });

        //instructor

        app.get("/instructor", async (req, res) => {
            const result = await instructorCollection.find().toArray();
            res.send(result);
        });

        //home page related api
        app.get("/home", async (req, res) => {
            const sort = { enrolledNumber: -1 };
            const result = await adminCollection
                .find()
                .sort(sort)
                .limit(6)
                .toArray();
            res.send(result);
        });

        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log(
            "Pinged your deployment. You successfully connected to MongoDB!"
        );
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("Language Master Teaching");
});

app.listen(port, () => {
    console.log("port no", port);
});
