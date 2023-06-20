require("dotenv").config();
require("express-async-errors");
const express = require("express");
const app = express();
//connect DB
const connectDB = require("./db/connect");
// Authentication middleware
const authenticateUser = require("./middleware/authentication");

//routers
const authRouter = require("./routes/auth");
const checksRouter = require("./routes/checks");
const companiesRouter = require("./routes/companies");
const customersRouter = require("./routes/customers");
const invoicesRouter = require("./routes/invoices");
const receiptsRouter = require("./routes/receipts");
const tasksRouter = require("./routes/tasks");

// error handler
const notFoundMiddleware = require("./middleware/not-found");
const errorHandlerMiddleware = require("./middleware/error-handler");

app.use(express.static("./public"));
app.use(express.json());

// routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/checks", checksRouter);
app.use("/api/v1/companies", companiesRouter);
app.use("/api/v1/customers", customersRouter);
app.use("/api/v1/invoices", invoicesRouter);
app.use("/api/v1/receipts", receiptsRouter);
app.use("/api/v1/tasks", tasksRouter);

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
