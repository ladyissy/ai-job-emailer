const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { startScheduler, runJobSearchProcess } = require("./services/scheduler");

const app = express();
const PORT = 3000;

// 确保 uploads 文件夹存在
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// --- 中间件设置 ---

// 1. 提供 public 文件夹中的静态文件 (例如 index.html)
app.use(express.static("public"));

// 2. 配置 multer 用于处理文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // 文件存储路径
  },
  filename: function (req, file, cb) {
    // 为了避免重名问题，可以在文件名中加入时间戳，但对于个人应用，直接使用原名更简单
    cb(null, Buffer.from(file.originalname, "latin1").toString("utf8"));
  },
});

const upload = multer({ storage: storage });

// --- API 路由 ---

// POST /api/config -接收并保存用户配置
app.post("/api/config", upload.single("resume"), (req, res) => {
  console.log("--- 收到 /api/config 请求 ---");
  console.log("请求 Body (表单文本字段):", req.body);
  console.log("请求 File (上传的文件信息):", req.file);

  try {
    const { keywords, email, reportTime } = req.body;

    // 验证数据是否存在
    if (!req.file || !keywords || !email || !reportTime) {
      console.error("验证失败: 缺少字段或文件。");
      return res
        .status(400)
        .json({ message: "缺少必要信息，请填写所有字段并上传简历。" });
    }

    console.log("简历文件似乎已成功保存至:", req.file.path);

    const config = {
      keywords: keywords.split(",").map((k) => k.trim()),
      email: email,
      reportTime: reportTime,
      resumePath: req.file.path, // 保存简历文件的相对路径
    };

    console.log("准备将以下数据写入 config.json:", config);

    // 将配置信息写入 config.json 文件
    fs.writeFileSync("config.json", JSON.stringify(config, null, 2));

    console.log("成功写入 config.json!");

    startScheduler();

    res
      .status(200)
      .json({ message: "设置已成功保存！AI 代理将在指定时间为您工作。" });
  } catch (error) {
    console.error("在保存配置过程中捕获到错误:", error);
    res.status(500).json({ message: "服务器内部错误，保存失败。" });
  }
});

app.post("/api/run-test", (req, res) => {
  console.log("\n--- 收到手动测试请求 ---");
  runJobSearchProcess(); // 直接调用核心任务
  res
    .status(200)
    .json({ message: "测试任务已触发！请在服务器终端查看日志输出。" });
});

// --- 启动服务器 ---
app.listen(PORT, () => {
  console.log(`服务器已启动，请访问 http://localhost:${PORT}`);

  startScheduler();
});
