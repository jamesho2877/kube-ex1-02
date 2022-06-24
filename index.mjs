import path from "path";
import express from "express";
import { writeFile, existsSync, unlink } from "node:fs";
import { engine } from "express-handlebars";
import fetch from "node-fetch";
import bodyParser from "body-parser";
import expressSanitizer from "express-sanitizer";
import cors from "cors";
import { connect } from "nats";


const {
  BACKEND = "false",
  PRODUCTION = "true",
  NATS_URL = "nats://my-nats:4222",
  BROADCASTER = "false",
  EXTERNAL_SERVICE_URL,
} = process.env;


if (BROADCASTER === "true") {
  const nc = connect({ url: NATS_URL });

  let busy = false;
  listenToCommBus();

  function listenToCommBus() {
    nc.subscribe(
      "comm_bus",
      { queue: "receiver.workers" },
      (msg) => {
        if (busy) return;
        if (msg === "anyone_listening") {
          console.log("im_listening");
          listenToDataBus();
          nc.publish("comm_bus", "im_listening");
        }
      }
    );
  }

  function listenToDataBus() {
    const dataSub = nc.subscribe("data_bus", (msg) => {
      busy = true;
      nc.unsubscribe(dataSub);
  
      const payload = JSON.parse(msg);
      console.log("Forward payload to external service", EXTERNAL_SERVICE_URL, payload);

      busy = false;
    });
  }
} else {
  let { PORT } = process.env;

  const app = express();
  const router = express.Router();

  app.use(cors());
  app.use(expressSanitizer());

  if (BACKEND === "true") {
    PORT = PORT || 3300;

    const nc = connect({ url: NATS_URL });
  
    // support both JSON & URL encoded bodies
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true })); 
  
    main();
  
    async function main() {
      const { default: Database } = await import("./src/database.mjs");
      const database = new Database();
  
      router.get("/healthz", async (req, res) => {
        const { err } = await database.testConnection();
        console.log("healthz - err", err);
        res.sendStatus(err ? 500 : 200);
      });
  
      router.get("/todos", async (req, res) => {
        res.setHeader("Content-Type", "application/json");
  
        const todoList = await database.readTodos();
  
        res.end(JSON.stringify({
          todos: todoList,
        }));
      });
  
      router.put("/todo", async (req, res) => {
        const todoID = req.sanitize(req.body.todoID);
        const todoStatus = req.sanitize(req.body.todoStatus);
  
        if (!todoID || !todoStatus) {
          return respInvalidTodo(
            res,
            "Invalid todo",
            JSON.stringify({ todoID: todoID })
          );
        }
  
        console.log("todoID:", todoID, todoStatus);
        const todo = await database.updateTodoStatus(todoID, todoStatus);
        sendDataToNAS(todo, "A todo was updated");
  
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ todo }));
      });
  
      router.post("/todo", async (req, res) => {
        const newTodo = req.sanitize(req.body.todo);
  
        if (!newTodo) {
          return respInvalidTodo(
            res,
            "Invalid todo - Empty todo",
            JSON.stringify({ todo: newTodo })
          );
        }
        
        if (newTodo.length > 140) {
          return respInvalidTodo(
            res,
            "Invalid todo - Exceeded 140 characters",
            JSON.stringify({ todo: newTodo })
          );
        }
  
        console.log("newTodo:", newTodo);
        const todo = await database.writeTodo(newTodo);
        sendDataToNAS(todo, "A todo was created");
  
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ todo }));
      });

      function sendDataToNAS(todo, message) {
        const commSub = nc.subscribe("comm_bus", (msg) => {
          
          if (msg !== "im_listening") return;
          
          console.log(`Found available conn - ${msg}`);

          nc.unsubscribe(commSub);
          nc.publish("data_bus", JSON.stringify({
            user: "bot",
            message: message,
            data: todo,
          }));
        });
    
        nc.publish("comm_bus", "anyone_listening");
      }
    }
  } else {
    PORT = PORT || 3200;
    const serverPath = PRODUCTION === "false" ? `http://localhost:3300` : `/api`;
    const bannerImageDirPath = path.resolve(process.cwd(), "media");
    const bannerImagePath = path.resolve(process.cwd(), "media/banner.jpg");
  
    // remove old image from shared storage - on start
    unlink(bannerImagePath, () => {
      console.log("Deleted old banner image from shared storage");
    });
  
    app.engine("handlebars", engine());
    app.set("view engine", "handlebars");
    app.use("/media", express.static(bannerImageDirPath));
    
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
  
  function respInvalidTodo(res, errMessage, errInfo) {
    console.log(`Error: ${errMessage}`, errInfo);
    res.status(400);
    res.send(errMessage);
  }
}