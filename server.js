import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import seriesRouter from "./routes/series.js";
import bodyParser from "body-parser";
import fileUpload from "express-fileupload";

dotenv.config();
const PORT = process.env.PORT || 4000;
const app = express();
app.use(cors());
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log(err);
  });
app.use(express.json());
app.use(bodyParser.json());
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/", // <– ensures a temp path exists
    createParentPath: true,
  })
);

app.use("/series", seriesRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
