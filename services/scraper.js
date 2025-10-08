const puppeteer = require("puppeteer");

/**
 * 抓取 Google 和 LinkedIn 上的职位信息
 * @param {string[]} keywords - 搜索关键词数组
 * @returns {Promise<object[]>} - 职位信息对象数组
 */
async function scrapeJobSites(keywords) {
  console.log("[Scraper] 启动浏览器...");
  // puppeteer.launch() 可能会有一些平台相关的警告，通常可以忽略
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  // 设置一个真实的用户代理，减少被识别为机器人的几率
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
  );

  let allJobs = [];

  // --- 抓取 Google Jobs ---
  // 注意: 网页选择器 (selector) 非常脆弱，如果目标网站更新了页面结构，这里的代码就需要相应调整。
  try {
    const googleQuery = keywords.join(" ") + " developer jobs";
    console.log(`[Scraper] 正在抓取 Google, 搜索词: "${googleQuery}"`);
    await page.goto(
      `https://www.google.com/search?q=${encodeURIComponent(
        googleQuery
      )}&ibp=htl;jobs`,
      { waitUntil: "networkidle2" }
    );

    // 等待职位列表的容器加载
    await page.waitForSelector("div.gws-plugins-horizon-jobs__tl-lvc", {
      timeout: 10000,
    });

    const googleJobs = await page.evaluate(() => {
      const jobs = [];
      // Google Jobs 的选择器会经常变化，这个选择器是基于某个时间点的结构
      document.querySelectorAll("li.iFjolb").forEach((item) => {
        const title = item.querySelector("div.BjJfJf.PUpOsf")?.innerText;
        const company = item.querySelector("div.vNEEBe")?.innerText;
        const location = item.querySelector("div.Qk80Jf")?.innerText;
        const link = item.closest("a")?.href;
        if (title && company && link) {
          jobs.push({ source: "Google", title, company, location, link });
        }
      });
      return jobs.slice(0, 10); // 只取前10条
    });
    console.log(`[Scraper] 从 Google 抓取到 ${googleJobs.length} 个职位。`);
    allJobs = allJobs.concat(googleJobs);
  } catch (error) {
    console.error(
      "[Scraper] 抓取 Google Jobs 时出错:",
      error.message.split("\n")[0]
    );
    console.log(
      "[Scraper] 提示: Google Jobs 抓取失败，可能是页面结构已更新或出现了人机验证。"
    );
  }

  // --- 抓取 LinkedIn Jobs ---
  try {
    const linkedinQuery = keywords.join(" ");
    console.log(`[Scraper] 正在抓取 LinkedIn, 搜索词: "${linkedinQuery}"`);
    await page.goto(
      `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(
        linkedinQuery
      )}`,
      { waitUntil: "networkidle2" }
    );

    await page.waitForSelector("ul.jobs-search__results-list", {
      timeout: 10000,
    });

    const linkedinJobs = await page.evaluate(() => {
      const jobs = [];
      document.querySelectorAll("div.base-search-card").forEach((item) => {
        const title = item.querySelector(
          "h3.base-search-card__title"
        )?.innerText;
        const company = item.querySelector(
          "h4.base-search-card__subtitle"
        )?.innerText;
        const location = item.querySelector(
          "span.job-search-card__location"
        )?.innerText;
        const link = item.querySelector("a.base-card__full-link")?.href;
        if (title && company && link) {
          jobs.push({ source: "LinkedIn", title, company, location, link });
        }
      });
      return jobs.slice(0, 10); // 只取前10条
    });
    console.log(`[Scraper] 从 LinkedIn 抓取到 ${linkedinJobs.length} 个职位。`);
    allJobs = allJobs.concat(linkedinJobs);
  } catch (error) {
    console.error(
      "[Scraper] 抓取 LinkedIn Jobs 时出错:",
      error.message.split("\n")[0]
    );
    console.log(
      "[Scraper] 提示: LinkedIn Jobs 抓取失败，可能是需要登录或页面结构已更新。"
    );
  }

  console.log("[Scraper] 关闭浏览器...");
  await browser.close();

  console.log(`[Scraper] 抓取完成，共找到 ${allJobs.length} 个职位。`);
  return allJobs;
}

module.exports = { scrapeJobSites };
