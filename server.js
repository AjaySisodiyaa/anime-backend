import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import seriesRouter from "./routes/series.js";
import movieRouter from "./routes/movie.js";
import searchRouter from "./routes/search.js";
import bodyParser from "body-parser";
import fileUpload from "express-fileupload";
import axios from "axios";

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

// sitemap
app.get("/sitemap.xml", async (req, res) => {
  try {
    const baseUrl = "https://majelo.onrender.com";

    const moviesRes = await axios.get(
      "https://anime-backend-5ok3.onrender.com/movie"
    );
    const seriesRes = await axios.get(
      "https://anime-backend-5ok3.onrender.com/series"
    );

    const movies = Array.isArray(moviesRes.data)
      ? moviesRes.data
      : moviesRes.data.data || [];
    const series = Array.isArray(seriesRes.data)
      ? seriesRes.data
      : seriesRes.data.data || [];

    let urls = [
      `${baseUrl}/`,
      `${baseUrl}/movie`,
      `${baseUrl}/series`,
      `${baseUrl}/search`,
    ];

    movies.forEach((m) => {
      urls.push(`${baseUrl}/movie/${m.slug || m._id}`);
    });

    series.forEach((s) => {
      urls.push(`${baseUrl}/series/${s.slug || s._id}`);
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?> 
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls
        .map(
          (url) => `
        <url>
          <loc>${url}</loc>
          <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
          <priority>0.8</priority>
        </url>`
        )
        .join("")}
    </urlset>`;

    res.header("Content-Type", "application/xml");
    res.send(xml);
  } catch (err) {
    console.error("❌ Error generating sitemap:", err);
    res.status(500).send("Error generating sitemap: " + err.message);
  }
});

app.get("/random-video", async (req, res) => {
  try {
    const topics = [
      "funny shorts",
      "emotional shorts",
      "politics shorts",
      "love shorts",
      "couple shorts",
      "romance shorts",
      "romantic shorts",
      "anime shorts",
      "doraemon shorts",
      "sad shorts",
      "happy shorts",
      "cute shorts",
      "dog shorts",
      "cat shorts",
      "baby shorts",
      "shorts",
      "shorts 2023",
      "shorts 2024",
      "shorts 2025",
    ];
    const randomQuery = topics[Math.floor(Math.random() * topics.length)];

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${randomQuery}&key=AIzaSyATJ5YzlJQukTb5NwvfZT-YUufSVQ5I4ZM`;
    const response = await fetch(url);
    const data = await response.json();

    // pick a random video
    const items = data.items || [];
    const randomVideo = items[Math.floor(Math.random() * items.length)];

    res.json(randomVideo);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch video" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
