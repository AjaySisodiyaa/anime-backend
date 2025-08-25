import Movie from "../models/Movie.js";
import Series from "../models/Series.js";
import express from "express";

const Router = express.Router();

// Universal search (Movies + Series)
Router.get("/:keyword", async (req, res) => {
  try {
    const regex = new RegExp(req.params.keyword, "i"); // case-insensitive

    // Search movies + series
    const [movies, series] = await Promise.all([
      Movie.find({
        $or: [{ title: regex }, { description: regex }, { tags: regex }],
      }),
      Series.find({
        $or: [{ title: regex }, { description: regex }, { tags: regex }],
      }),
    ]);

    res.json({ movies, series });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default Router;
