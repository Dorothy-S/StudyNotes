const express = require("express");
const router = express.Router();
const Note = require("../models/Note");
const requireAuth = require("../middleware/auth");

// GET all notes 
router.get("/", requireAuth, async (req, res) => {
    try {
        const notes = await Note.find({ userId: req.session.user.id })
            .sort({ createdAt: -1 });

        res.json(notes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET one note
router.get("/:id", requireAuth, async (req, res) => {
    try {
        const note = await Note.findOne({
            _id: req.params.id,
            userId: req.session.user.id
        });

        res.json(note);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE note
router.post("/", requireAuth, async (req, res) => {
    try {
        const note = await Note.create({
            title: req.body.title,
            course: req.body.course,
            content: req.body.content,
            userId: req.session.user.id
        });

        res.json(note);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE note
router.put("/:id", requireAuth, async (req, res) => {
    try {
        const updated = await Note.findOneAndUpdate(
            { _id: req.params.id, userId: req.session.user.id },
            req.body,
            { new: true }
        );

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE note
router.delete("/:id", requireAuth, async (req, res) => {
    try {
        await Note.findOneAndDelete({
            _id: req.params.id,
            userId: req.session.user.id
        });

        res.json({ message: "Note deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
