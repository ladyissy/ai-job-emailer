const puppeteer = require("puppeteer");

/**
 * 自动向下滚动页面以加载更多内容。
 * @param {import('puppeteer').Page} page - Puppeteer 页面对象。
 * @param {number} scrollAttempts - 尝试滚动的次数。
 */
const autoScroll = async (page, scrollAttempts = 10) => {
  console.log(`[Scraper] 正在滚动页面以加载更多结果...`);
  try {
    for (let i = 0; i < scrollAttempts; i++) {
      await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
      // 延长等待时间以确保内容加载
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } catch (error) {
    console.log(`[Scraper] 滚动时发生错误 (可忽略): ${error.message}`);
  }
};

/**
 * 为单个关键词抓取 Google Jobs。
 * @param {import('puppeteer').Page} page - Puppeteer 页面对象。
 * @param {string} keyword - 搜索关键词。
 */
const scrapeGoogleForKeyword = async (page, keyword) => {
  try {
    const url = `https://www.google.com/search?q=${encodeURIComponent(
      keyword
    )}&ibp=htl;jobs`;
    console.log(`[Scraper] 正在抓取 Google: ${keyword}`);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    await autoScroll(page);

    const jobs = await page.evaluate(() => {
      const results = [];
      // Google Jobs 的选择器很脆弱，li.iFjolb 是当前比较稳定的选择
      document.querySelectorAll("li.iFjolb").forEach((item) => {
        const title = item.querySelector("div.BjJfJf")?.innerText;
        const company = item.querySelector("div.vNEEBe")?.innerText;
        // Google 的链接需要特殊处理，这里我们直接生成一个搜索链接
        if (title && company) {
          results.push({
            title,
            company,
            link: `https://www.google.com/search?q=${encodeURIComponent(
              title + " at " + company
            )}&ibp=htl;jobs`,
            description:
              item.querySelector("div.YgLbBe")?.innerText || "无描述预览。",
          });
        }
      });
      return results;
    });
    console.log(
      `[Scraper] 从 Google 为 "${keyword}" 找到 ${jobs.length} 个职位。`
    );
    return jobs;
  } catch (error) {
    console.error(
      `[Scraper] 抓取 Google 时出错 ("${keyword}"):`,
      error.message.split("\n")[0]
    );
    return [];
  }
};

/**
 * 为单个关键词抓取 LinkedIn Jobs。
 * @param {import('puppeteer').Page} page - Puppeteer 页面对象。
 * @param {string} keyword - 搜索关键词。
 */
const scrapeLinkedInForKeyword = async (page, keyword) => {
  try {
    const url = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(
      keyword
    )}`;
    console.log(`[Scraper] 正在抓取 LinkedIn: ${keyword}`);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    // 尝试点击 "See more jobs" 按钮
    try {
      const seeMoreButton = await page.$(
        ".infinite-scroller__show-more-button"
      );
      if (seeMoreButton) {
        console.log('[Scraper] 发现 "See more jobs" 按钮，正在点击...');
        await seeMoreButton.click();
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 等待加载
      }
    } catch (e) {
      console.log('[Scraper] 未找到 "See more jobs" 按钮，直接滚动。');
    }

    await autoScroll(page);

    const jobs = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll("div.base-search-card").forEach((item) => {
        const title = item.querySelector(
          "h3.base-search-card__title"
        )?.innerText;
        const company = item.querySelector(
          "h4.base-search-card__subtitle"
        )?.innerText;
        const link = item.querySelector("a.base-card__full-link")?.href;
        if (title && company && link) {
          results.push({
            title,
            company,
            link,
            description:
              item.querySelector("p.job-search-card__snippet")?.innerText ||
              "无描述。",
          });
        }
      });
      return results;
    });
    console.log(
      `[Scraper] 从 LinkedIn 为 "${keyword}" 找到 ${jobs.length} 个职位。`
    );
    return jobs;
  } catch (error) {
    console.error(
      `[Scraper] 抓取 LinkedIn 时出错 ("${keyword}"):`,
      error.message.split("\n")[0]
    );
    return [];
  }
};

/**
 * 主抓取函数，协调所有抓取任务。
 * @param {string[]} keywords - 搜索关键词数组。
 */
const scrapeJobSites = async (keywords) => {
  console.log("[Scraper] 启动浏览器，开始所有抓取任务...");
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
      ],
    });
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );

    let allJobs = [];
    for (const keyword of keywords) {
      allJobs = allJobs.concat(await scrapeGoogleForKeyword(page, keyword));
      allJobs = allJobs.concat(await scrapeLinkedInForKeyword(page, keyword));
    }

    // 基于职位标题和公司名称移除重复项
    const uniqueJobs = allJobs.filter(
      (job, index, self) =>
        index ===
        self.findIndex(
          (j) => j.title === job.title && j.company === job.company
        )
    );

    console.log(
      `[Scraper] 所有平台抓取完毕，共找到 ${uniqueJobs.length} 个不重复的职位。`
    );
    return uniqueJobs;
  } catch (error) {
    console.error(`[Scraper] 在主抓取流程中发生严重错误:`, error);
    return [];
  } finally {
    if (browser) {
      console.log("[Scraper] 关闭浏览器。");
      await browser.close();
    }
  }
};

module.exports = { scrapeJobSites };
