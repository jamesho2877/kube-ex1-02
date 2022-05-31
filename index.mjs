import path from "path";
import express from "express";
import { writeFile, existsSync } from "node:fs";
import { engine } from "express-handlebars";
import fetch from "node-fetch";

const PORT = process.env.PORT || 3300;
const app = express();
const router = express.Router();

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.use("/media", express.static(path.resolve(process.cwd(), "media")));

router.get("/", async (req, res) => {
  const bannerImagePath = path.resolve(process.cwd(), "media/banner.jpg");
  const isBannerExisted = existsSync(bannerImagePath);
  if (!isBannerExisted) {
    await downloadImage("https://picsum.photos/1200", bannerImagePath);
  }
  
  res.render("home");
});

app.use(router);

app.listen(PORT, () => {
  console.log(`Server started in port ${PORT}`);
});




async function downloadImage(inputImageURL, outputImageURL) {
  const response = await fetch(inputImageURL);
  const arrBuffer = await response.arrayBuffer();
  writeFile(outputImageURL, Buffer.from(arrBuffer), () => {
    console.log('Downloaded image successfully!');
  });
}