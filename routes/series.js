import dotenv from "dotenv";
dotenv.config();
import express from "express";
const Router = express.Router();
import Series from "../models/Series.js";
import { v2 as cloudinary } from "cloudinary";
import {
  searchSeriesByTitle,
  normalizeSeries,
  getSeriesById,
} from "../services/tmdb.js";
import slugify from "slugify";
import PopularSeries from "../models/PopularSeries.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

cloudinary.api
  .ping()
  .then((res) => console.log("Cloudinary OK:", res))
  .catch((err) => console.error("Cloudinary FAIL:", err));

Router.get("/popular", async (req, res) => {
  try {
    const series = await PopularSeries.find()
      .sort({ views: -1 })
      .limit(10)
      .populate("seriesId");

    res.json(series);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// When a series is watched
Router.post("/:id/watch", async (req, res) => {
  try {
    const { id } = req.params;

    let popular = await PopularSeries.findOne({ seriesId: id });

    if (!popular) {
      popular = new PopularSeries({ seriesId: id, views: 1 });
    } else {
      popular.views += 1;
    }

    await popular.save();
    res.json(popular);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search series by keyword (title, tags, description)
Router.get("/search/:keyword", async (req, res) => {
  try {
    const regex = new RegExp(req.params.keyword, "i"); // case-insensitive

    const series = await Series.find({
      $or: [{ title: regex }, { description: regex }, { tags: regex }],
    });

    res.json(series);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

Router.get("/tag/:tag", async (req, res) => {
  try {
    const series = await Series.find({
      tags: { $regex: req.params.tag, $options: "i" },
    });
    res.json(series);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

Router.get("/:slug", async (req, res) => {
  try {
    const series = await Series.findOne({
      slug: { $regex: req.params.slug, $options: "i" },
    });
    if (!series) return res.status(404).json({ message: "Series not found" });
    res.json(series);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// auto-create by TMDB ID
Router.post("/auto/Id", async (req, res) => {
  try {
    const { tmdbId, language = "en-US" } = req.body;
    if (!tmdbId) return res.status(400).json({ error: "tmdbId is required" });

    const tv = await getSeriesById(tmdbId, language);
    if (!tv) return res.status(404).json({ error: "No series found on TMDB" });

    const norm = await normalizeSeries(tv, language);

    const willSlug = slugify(norm.title, { lower: true, strict: true });
    const existing = await Series.findOne({ slug: willSlug });
    if (existing)
      return res
        .status(409)
        .json({ error: "Series already exists", series: existing });

    const episodesToAdd = req.body.episode
      .split(",")
      .map((ep) => ep.trim())
      .filter((ep) => ep.length > 0);

    const doc = new Series({
      title: norm.title,
      description: norm.description,
      image: norm.image,
      tags: norm.tags,
      releaseDate: norm.releaseDate,
      episode: episodesToAdd || [],
    });

    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Auto-create Series from TMDB by title */
Router.post("/auto", async (req, res) => {
  try {
    const { title, language = "en-IN", region = "IN" } = req.body;
    if (!title) return res.status(400).json({ error: "title is required" });

    const tv = await searchSeriesByTitle(title, { language, region });
    if (!tv) return res.status(404).json({ error: "No series found on TMDB" });

    const norm = await normalizeSeries(tv, language);

    const willSlug = slugify(norm.title, { lower: true, strict: true });
    const existing = await Series.findOne({ slug: willSlug });
    if (existing)
      return res
        .status(409)
        .json({ error: "Series already exists", series: existing });

    const doc = new Series({
      title: norm.title,
      description: norm.description,
      image: norm.image,
      tags: norm.tags,
      releaseDate: norm.releaseDate,
      // episode: [] // keep your episodes array if you use it
    });

    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// create a new series
Router.post("/", async (req, res) => {
  //   console.log(req.files.image.tempFilePath);
  try {
    if (!req.body.title || !req.files.image) {
      return res.status(400).json({ error: " required all fields" });
    }
    const image = await cloudinary.uploader.upload(
      req.files.image.tempFilePath,
      { resource_type: "image" }
    );

    const series = new Series({
      title: req.body.title,
      description: req.body.description || "", // Optional description
      image: image.secure_url,
      imageId: image.public_id,
      tags: req.body.tags
        ? req.body.tags.split(",").map((tag) => tag.trim())
        : [],
      // slug: slugify(req.body.title, { lower: true, strict: true }),
      releaseDate: req.body.releaseDate || new Date(),
    });
    await series.save();
    res.json(series);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// get all series
Router.get("/", async (req, res) => {
  try {
    const series = await Series.find({}).sort({ updatedAt: -1 });
    res.json(series);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// get a single series
Router.get("/id/:id", async (req, res) => {
  try {
    const series = await Series.findById(req.params.id);
    if (!series) {
      return res.status(404).json({ error: "Series not found" });
    }
    res.json(series);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// add episode
Router.patch("/episode/:id", async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ error: "Series ID is required" });
    }
    const series = await Series.findById(req.params.id);
    if (!series) {
      return res.status(404).json({ error: "Series not found" });
    }
    if (!req.body.episode) {
      return res.status(400).json({ error: "Episode is required" });
    }
    const episodesToAdd = req.body.episode
      .split(",")
      .map((ep) => ep.trim())
      .filter((ep) => ep.length > 0);

    // ✅ Push all at once
    series.episode.push(...episodesToAdd);

    await series.save();
    res.json(series);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// add episode and edit series
Router.patch("/image/:id", async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ error: "Series ID is required" });
    }
    const series = await Series.findById(req.params.id);
    if (!req.files.image) {
      return res.status(400).json({ error: "Image is required" });
    }
    await cloudinary.uploader.destroy(series.imageId);
    const image = await cloudinary.uploader.upload(
      req.files.image.tempFilePath,
      { resource_type: "image" }
    );
    series.image = image.secure_url;
    series.imageId = image.public_id;

    await series.save();
    res.json(series);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// add episode and edit series
Router.patch("/title/:id", async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ error: "Series ID is required" });
    }
    const series = await Series.findById(req.params.id);

    if (!req.body.title) {
      return res.status(400).json({ error: "Title is required" });
    }
    series.title = req.body.title;
    await series.save();
    res.json(series);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// remove episode
Router.delete("/:seriesId/:episodeId", async (req, res) => {
  try {
    if (!req.params.seriesId || !req.params.episodeId) {
      return res
        .status(400)
        .json({ error: "Series ID and Episode ID are required" });
    }
    const series = await Series.findById({ _id: req.params.seriesId });
    if (!series) {
      return res.status(404).json({ error: "Series not found" });
    }
    const episode = series.episode.slice(
      req.params.episodeId - 1,
      req.params.episodeId
    );
    series.episode.pull(episode.toString());
    await series.save();
    res.json(series);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
export default Router;
