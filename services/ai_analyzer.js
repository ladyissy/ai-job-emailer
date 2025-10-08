const { GoogleGenerativeAI } = require("@google/generative-ai");
const pdf = require("pdf-parse");
require("dotenv").config();

/**
 * Decodes a Base64 encoded string into plain text.
 * @param {string} base64String The Base64 encoded string.
 * @returns {string} The decoded plain text.
 */
const decodeResume = (base64String) => {
  // In a Node.js environment, we use Buffer to handle Base64 decoding.
  return Buffer.from(base64String, "base64").toString("utf8");
};

/**
 * Analyzes job listings against a resume using the Gemini AI.
 * @param {Array<object>} jobListings - An array of job objects, each with title, company, and description.
 * @returns {Promise<Array<object>|null>} A promise that resolves to an array of analyzed jobs with scores and reasons, or null if an error occurs.
 */
const analyzeJobsWithAI = async (jobListings) => {
  console.log("[AI Analyzer] Starting job analysis...");

  try {
    // 1. Validate environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    const resumeBase64 = process.env.RESUME_BASE64;

    if (!apiKey) {
      console.error(
        "[AI Analyzer] Error: GEMINI_API_KEY environment variable is not set"
      );
      return null;
    }

    if (!resumeBase64) {
      console.error(
        "[AI Analyzer] Error: RESUME_BASE64 environment variable is not set"
      );
      return null;
    }

    // 2. Initialize Gemini client with validation
    console.log("[AI Analyzer] Initializing Gemini client...");
    const genAI = new GoogleGenerativeAI(apiKey);

    // Verify API key format (basic check)
    if (!apiKey.startsWith("AI")) {
      console.error("[AI Analyzer] Error: Invalid Gemini API key format");
      return null;
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest", // Using stable model instead of preview
    });

    // 2. 解码 Base64 简历内容
    console.log("[AI Analyzer] Decoding resume from Base64...");
    const resumeText = decodeResume(resumeBase64);
    console.log("[AI Analyzer] Resume decoded successfully.");

    // 3. 构建详细的提示 (Prompt)
    const prompt = `
            You are a professional career consultant. Your task is to analyze a resume and a list of job openings.
            Based ONLY on the provided resume, analyze each job and provide a score and reason.

            Resume:
            ---
            ${resumeText}
            ---

            Job Openings (JSON format):
            ${JSON.stringify(jobListings, null, 2)}

            Your response MUST be ONLY a single, valid JSON object. This object must have one key: "ranked_jobs".
            The value of "ranked_jobs" must be a JSON array of job objects.
            Each object in the array must have this exact structure, using snake_case for the score: { "title": "...", "company": "...", "match_score": ..., "reason": "...", "link": "..." }.
            Do not include any text outside of the JSON object itself.
        `;

    // 4. 调用 Gemini API
    console.log("[AI Analyzer] Calling Gemini API for analysis...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 5. 解析 AI 返回的 JSON 结果
    console.log("[AI Analyzer] AI response received. Parsing JSON...");
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      text = jsonMatch[1];
    }

    // Trim any extra whitespace that might interfere with parsing
    text = text.trim();
    const report = JSON.parse(text);

    console.log(
      `[AI Analyzer] Analysis complete. Found ${report.length} matched jobs.`
    );
    return report;
  } catch (error) {
    console.error("[AI Analyzer] An error occurred during AI analysis:", error);
    return null;
  }
};

module.exports = { analyzeJobsWithAI };
