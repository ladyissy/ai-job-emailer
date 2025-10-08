const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const { scrapeJobSites } = require("./scraper"); // 1. 引入真实的 scraper
const { analyzeJobsWithAI } = require("./ai_analyzer");
const { sendReportEmail } = require("./mailer");
require("dotenv").config();

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

  try {
    // 第 1 步: 从环境变量中读取配置信息
    console.log(
      "[Scheduler] Reading configuration from environment variables..."
    );
    const keywords = process.env.SEARCH_KEYWORDS;
    const targetEmail = process.env.TARGET_EMAIL;

    // 验证环境变量是否存在
    if (!keywords || !targetEmail) {
      console.error(
        "[Scheduler] Error: SEARCH_KEYWORDS or TARGET_EMAIL environment variables are not set."
      );
      return;
    }
    const keywordList = keywords.split(",").map((k) => k.trim());

    console.log(`[Scheduler] Keywords: ${keywordList.join(", ")}`);
    console.log(`[Scheduler] Target Email: ${targetEmail}`);

    // 2. 调用 scraper 抓取招聘信息
    console.log("[Scheduler] 步骤 1: 开始抓取网站...");
    const jobListings = await scrapeJobSites(keywordList);

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

    console.log(
      `[Scheduler] AI 返回了 ${analysisResult.ranked_jobs.length} 个职位，正在筛选前 10 名以生成最终报告。`
    );
    const sortedJobs = analysisResult.ranked_jobs.sort(
      (a, b) => b.match_score - a.match_score
    );
    const top10Jobs = sortedJobs.slice(0, 10);

    const finalReport = { ranked_jobs: top10Jobs };

    console.log("[Scheduler] 步骤 3: 生成求职报告，发送报告邮件...");
    await sendReportEmail(finalReport, targetEmail);

    console.log("[Scheduler] 本次任务流程结束。");
    console.log("--------------------------------------------------");
  } catch (error) {
    console.error("[Scheduler] 执行求职流程时发生严重错误:", error);
  } finally {
    isTaskRunning = false; // 确保任务结束后解锁
  }
};

let scheduledTask = null;

// (这个函数在 Render 的 Cron Job 环境中不会被直接使用)
const startScheduler = () => {
  console.log(
    "Scheduler loaded. In a server environment, this would set up a cron job."
  );
  console.log(
    "For Render, the start command triggers `runJobSearchProcess` directly."
  );
};

module.exports = { startScheduler, runJobSearchProcess };
