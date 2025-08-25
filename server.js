import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import seriesRouter from "./routes/series.js";
import movieRouter from "./routes/movie.js";
import searchRouter from "./routes/search.js";
import bodyParser from "body-parser";
import fileUpload from "express-fileupload";

dotenv.config();
const PORT = process.env.PORT || 4000;
const app = express();
app.use(cors());
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("Connected to MongoDB");

    try {
      await mongoose.connection.db.collection("series").dropIndex("episode_1");
      console.log("Dropped episode_1 index ✅");
    } catch (err) {
      console.log("Index not found or already removed:", err.message);
    }
  })
  .catch((err) => console.log(err));
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
app.use("/movie", movieRouter);
app.use("/search", searchRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
