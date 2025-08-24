import dotenv from "dotenv";
dotenv.config();
import express from "express";
const Router = express.Router();
import Series from "../models/Series.js";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

cloudinary.api
  .ping()
  .then((res) => console.log("Cloudinary OK:", res))
  .catch((err) => console.error("Cloudinary FAIL:", err));

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
    console.log("image", image);
    const series = new Series({
      title: req.body.title,
      image: image.secure_url,
      imageId: image.public_id,
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
    const series = await Series.find({});
    res.json(series);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// get a single series
Router.get("/:id", async (req, res) => {
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

    if (!req.body.episode) {
      return res.status(400).json({ error: "Episode is required" });
    }
    series.episode.push(req.body.episode);

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
