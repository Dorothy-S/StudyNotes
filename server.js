// Load environment variables
require("dotenv").config();

// Import app.js from config (FULL BACKEND)
const app = require("./config/app");

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
