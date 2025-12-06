const mongoose = require("mongoose");

// Defins a schema
const NoteSchema = new mongoose.Schema({
    title: { type: String, required: true }, //Title of note
    course: { type: String, required: true }, //Course conneted with note
    content: { type: String, required: true }, //Body of note

    // Connect note  to user
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    createdAt: { type: Date, default: Date.now } // makes time of when note was creates
},
{
    collection: "notes"
});

module.exports = mongoose.model("Note", NoteSchema); //exports
