import express from "express";

const PORT = process.env.PORT || 3300;
const app = express();
const router = express.Router();

router.get("/", (req, res) => {
  res.send("Hello there!");
});

app.use(router);

app.listen(PORT, () => {
  console.log(`Server started in port ${PORT}`);
});