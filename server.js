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

// sitemap
app.get("/sitemap.xml", async (req, res) => {
  try {
    // Example: dynamic pages fetched from DB
    const movies = [
      { slug: "naruto", updated: "2025-08-25" },
      { slug: "one-piece", updated: "2025-08-25" },
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Main pages
    xml += `
      <url><loc>https://majelo.onrender.com/</loc><priority>1.0</priority></url>
      <url><loc>https://majelo.onrender.com/movie</loc><priority>0.8</priority></url>
      <url><loc>https://majelo.onrender.com/series</loc><priority>0.8</priority></url>
      <url><loc>https://majelo.onrender.com/search</loc><priority>0.5</priority></url>
    `;

    // Dynamic movie pages
    movies.forEach((m) => {
      xml += `
        <url>
          <loc>https://majelo.onrender.com/movie/${m.slug}</loc>
          <lastmod>${m.updated}</lastmod>
          <priority>0.6</priority>
        </url>`;
    });

    xml += `</urlset>`;

    res.header("Content-Type", "application/xml");
    res.send(xml);
  } catch (err) {
    res.status(500).send("Error generating sitemap");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
