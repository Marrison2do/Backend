require("dotenv").config();
require("express-async-errors");
const express = require("express");
const app = express();
//connect DB
const connectDB = require("./db/connect");
// Authentication middleware
const authenticateUser = require("./middleware/authentication");
const cors = require("cors");

//routers
const authRouter = require("./routes/auth");
const checksRouter = require("./routes/checks");
const companiesRouter = require("./routes/companies");
const customersRouter = require("./routes/customers");
const invoicesRouter = require("./routes/invoices");
const receiptsRouter = require("./routes/receipts");
const tasksRouter = require("./routes/tasks");
const pricesRouter = require("./routes/prices");
const sealsRouter = require("./routes/seals");
const exchangeRouter = require("./routes/exchange");
const globalRouter = require("./routes/globals");

// error handler
const notFoundMiddleware = require("./middleware/not-found");
const errorHandlerMiddleware = require("./middleware/error-handler");

app.use(cors());
app.use(express.static("./public"));
app.use(express.json());

// routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/checks", authenticateUser, checksRouter);
app.use("/api/v1/companies", authenticateUser, companiesRouter);
app.use("/api/v1/customers", authenticateUser, customersRouter);
app.use("/api/v1/invoices", authenticateUser, invoicesRouter);
app.use("/api/v1/receipts", authenticateUser, receiptsRouter);
app.use("/api/v1/tasks", authenticateUser, tasksRouter);
app.use("/api/v1/prices", authenticateUser, pricesRouter);
app.use("/api/v1/seals", authenticateUser, sealsRouter);
app.use("/api/v1/exchange", authenticateUser, exchangeRouter);
app.use("/api/v1/globals", authenticateUser, globalRouter);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

const port = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    app.listen(port, () =>
      console.log(`Server is listening on port ${port}...`)
    );
  } catch (error) {
    console.log(error);
  }
};

start();
