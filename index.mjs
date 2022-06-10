import path from "path";
import express from "express";
import { writeFile, existsSync, unlink } from "node:fs";
import { engine } from "express-handlebars";
import fetch from "node-fetch";
import bodyParser from "body-parser";
import expressSanitizer from "express-sanitizer";
import cors from "cors";


let { PORT } = process.env;
const {
  BACKEND = "false",
  PRODUCTION = "true",
} = process.env;

const app = express();
const router = express.Router();

app.use(cors());
app.use(expressSanitizer());

if (BACKEND === "true") {
  PORT = PORT || 3300;

  // support both JSON & URL encoded bodies
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true })); 

  main();

  async function main() {
    const { default: Database } = await import("./src/database.mjs");
    const database = new Database();

    router.get("/todos", async (req, res) => {
      res.setHeader("Content-Type", "application/json");

      const todoList = await database.readTodos();

      res.end(JSON.stringify({
        todos: todoList,
      }));
    });

    router.post("/todos", async (req, res) => {
      const newTodo = req.sanitize(req.body.todo);
      if (!newTodo) {
        res.status(400);
        res.send('Invalid todo');
        return;
      }
      
      const todo = await database.writeTodo(newTodo);

      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ todo }));
    });
  }
} else {
  PORT = PORT || 3200;
  const serverPath = PRODUCTION === "false" ? `http://localhost:3300` : `/api`;
  const bannerImagePath = path.resolve(process.cwd(), "media/banner.jpg");

  // remove old image from shared storage - on start
  unlink(bannerImagePath, () => {
    console.log("Deleted old banner image from shared storage");
  });

  app.engine("handlebars", engine());
  app.set("view engine", "handlebars");
  app.use("/media", express.static(path.resolve(process.cwd(), "media")));
  
  router.get("/", async (req, res) => {
    const isBannerExisted = existsSync(bannerImagePath);
    if (!isBannerExisted) {
      await downloadImage("https://picsum.photos/1200", bannerImagePath);
    }
    
    res.render("home", { serverPath });
  });
}

app.use(router);

app.listen(PORT, () => {
  console.log(`Server started in port ${PORT}`);
});




async function downloadImage(inputImageURL, outputImageURL) {
  const response = await fetch(inputImageURL);
  const arrBuffer = await response.arrayBuffer();
  writeFile(outputImageURL, Buffer.from(arrBuffer), () => {
    console.log("Downloaded image successfully!");
  });
}