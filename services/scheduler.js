const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const { scrapeJobSites } = require("./scraper"); // 1. 引入真实的 scraper
const { analyzeJobsWithAI } = require("./ai_analyzer");
const { sendReportEmail } = require("./mailer");

// 用于防止任务并发执行的锁
let isTaskRunning = false;

// 真实的核心任务流程
const runJobSearchProcess = async () => {
  if (isTaskRunning) {
    console.log("[Scheduler] 上一个任务仍在运行中，本次调度已跳过。");
    return;
  }

  isTaskRunning = true;
  console.log("--------------------------------------------------");
  console.log(`[${new Date().toLocaleString()}] 定时任务触发！`);

  const configPath = path.join(__dirname, "..", "config.json");
  if (!fs.existsSync(configPath)) {
    console.error("[Scheduler] 错误: 找不到 config.json，任务无法执行。");
    isTaskRunning = false;
    return;
  }

  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const { keywords } = config;

    if (!keywords || keywords.length === 0) {
      console.error("[Scheduler] 错误: 配置文件中没有关键词，任务无法执行。");
      isTaskRunning = false;
      return;
    }

    // 2. 调用 scraper 抓取招聘信息
    console.log("[Scheduler] 步骤 1: 开始抓取网站...");
    const jobListings = await scrapeJobSites(keywords);

    if (jobListings.length === 0) {
      console.log("[Scheduler] 未抓取到任何职位信息，本次任务结束。");
      console.log("--------------------------------------------------");
      isTaskRunning = false;
      return;
    }
    console.log(
      `[Scheduler] 抓取完成，共获得 ${jobListings.length} 条职位信息。`
    );
    console.log(jobListings); // 如果需要，可以取消注释来查看抓取到的具体内容

    // 后续步骤的占位符
    console.log("[Scheduler] 步骤 2: 调用 Gemini AI 分析和匹配职位...");
    const analysisResult = await analyzeJobsWithAI(jobListings);

    console.log("[Scheduler] AI 分析完成！最高匹配的职位是:");
    // 打印出最匹配的几个职位，便于调试
    console.log(JSON.stringify(analysisResult, null, 2));

    console.log("[Scheduler] 步骤 3: 生成求职报告，发送报告邮件...");
    await sendReportEmail(analysisResult);

    console.log("[Scheduler] 本次任务流程结束。");
    console.log("--------------------------------------------------");
  } catch (error) {
    console.error("[Scheduler] 执行求职流程时发生严重错误:", error);
  } finally {
    isTaskRunning = false; // 确保任务结束后解锁
  }
};

let scheduledTask = null;

const startScheduler = () => {
  // 如果已有任务在运行，先停止它
  if (scheduledTask) {
    scheduledTask.stop();
  }

  const configPath = path.join(__dirname, "..", "config.json");
  if (!fs.existsSync(configPath)) {
    console.log("[Scheduler] 配置文件 (config.json) 不存在，调度器未启动。");
    return;
  }

  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const { reportTime } = config;
    if (!reportTime || !/^\d{2}:\d{2}$/.test(reportTime)) {
      console.error("[Scheduler] 报告时间格式不正确，调度器无法启动。");
      return;
    }
    const [hour, minute] = reportTime.split(":");
    const cronExpression = `${minute} ${hour} * * *`;

    scheduledTask = cron.schedule(cronExpression, runJobSearchProcess);

    console.log(
      `[Scheduler] 定时任务已更新！将在每天 ${hour}:${minute} 为您执行求职任务。`
    );
  } catch (error) {
    console.error("[Scheduler] 启动调度器时出错:", error);
  }
};

module.exports = { startScheduler, runJobSearchProcess };
