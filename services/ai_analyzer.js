const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");

/**
 * 使用 Gemini AI 分析抓取到的职位列表与用户简历的匹配度
 * @param {object[]} jobListings - 从 scraper.js 获取的职位对象数组
 * @returns {Promise<object>} - AI 分析后的结果
 */
async function analyzeJobsWithAI(jobListings) {
  console.log("[AI Analyzer] 开始 AI 分析流程...");

  // 1. 读取配置文件以获取简历路径
  const configPath = path.join(__dirname, "..", "config.json");
  if (!fs.existsSync(configPath)) {
    throw new Error("找不到 config.json 文件。");
  }
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const resumePath = path.join(__dirname, "..", config.resumePath);

  if (!fs.existsSync(resumePath)) {
    throw new Error(`找不到简历文件于: ${resumePath}`);
  }

  // 2. 解析简历 PDF 文件，提取文本内容
  const dataBuffer = fs.readFileSync(resumePath);
  const resumeData = await pdf(dataBuffer);
  const resumeText = resumeData.text;
  console.log("[AI Analyzer] 成功读取并解析简历内容。");

  // 3. 构建发送给 Gemini API 的 Prompt
  const prompt = `
        **角色**: 你是一位专业的、经验丰富的技术招聘顾问和职业规划师。

        **任务**: 基于以下用户的简历和今天抓取到的职位列表，请进行深入分析。你需要为每个职位评估其与简历的匹配度，并以清晰、结构化的 JSON 格式返回结果。

        **用户简历核心内容**:
        ---
        ${resumeText.substring(0, 3000)} 
        ---
        (*为保证效率，只截取部分简历内容*)

        **今日职位列表**:
        ---
        ${JSON.stringify(jobListings, null, 2)}
        ---

        **输出要求 (必须严格遵守)**:
        1.  返回一个 JSON 对象，该对象包含一个名为 "ranked_jobs" 的数组。
        2.  "ranked_jobs" 数组中的每个元素都是一个对象，代表一个职位。
        3.  每个职位对象必须包含以下字段:
            - "title": (String) 职位名称。
            - "company": (String) 公司名称。
            - "match_score": (Number) 匹配度得分，范围从 0 到 100，分数越高代表越匹配。
            - "reason": (String) 为什么给出这个分数？用一句话简明扼要地总结匹配的关键点或不匹配的原因。
            - "link": (String) 原始的职位链接。
        4.  请根据 "match_score" 对 "ranked_jobs" 数组进行降序排序，最匹配的职位排在最前面。
        5.  只分析和返回最多5个最匹配的职位。
        6.  不要在你的最终输出中包含任何除了 JSON 对象以外的文字、解释或注释。
    `;

  console.log("[AI Analyzer] Prompt 已构建，准备调用 Gemini API...");

  // 4. 调用 Gemini API
  const apiKey = "AIzaSyDfHbOQOcF_n1sTQ1Of3ts9vN09S65T9ZA";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `API 请求失败，状态码: ${response.status}, 详情: ${errorBody}`
      );
    }

    const result = await response.json();
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      console.error(
        "Gemini API 返回了空内容。原始返回:",
        JSON.stringify(result)
      );
      throw new Error("AI未能生成分析结果。");
    }

    console.log("[AI Analyzer] 成功从 Gemini API 获取到分析结果。");

    // 清理并解析AI返回的JSON字符串
    const jsonString = rawText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const analysisResult = JSON.parse(jsonString);

    return analysisResult;
  } catch (error) {
    console.error("[AI Analyzer] 调用 Gemini API 或解析结果时出错:", error);
    throw error;
  }
}

module.exports = { analyzeJobsWithAI };
