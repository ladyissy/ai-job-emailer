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

    const models = genAI.ListModels();
    console.log("[AI Analyzer] Available models:", models);

    const model = genAI.getGenerativeModel({
      model: "gemini-pro", // Using stable model instead of preview
    });

    // 2. 解码 Base64 简历内容
    console.log("[AI Analyzer] Decoding resume from Base64...");
    const resumeText = decodeResume(resumeBase64);
    console.log("[AI Analyzer] Resume decoded successfully.");

    // 3. 构建详细的提示 (Prompt)
    const prompt = `
            Based on the following resume:
            --- START RESUME ---
            ${resumeText}
            --- END RESUME ---

            Please act as a professional career consultant. Analyze the following list of job openings. For each job, provide a "matchScore" from 0 to 100 indicating how well my resume matches the job requirements, and a brief, one-sentence "reason" explaining your score.

            The list of jobs is provided in this JSON format:
            ${JSON.stringify(jobListings, null, 2)}

            Your final output MUST be a valid JSON array. Each object in the array should represent a job and have the following structure: { "title": "...", "company": "...", "matchScore": ..., "reason": "...", "link": "..." }. Do not include any text or formatting outside of the JSON array itself.
        `;

    // 4. 调用 Gemini API
    console.log("[AI Analyzer] Calling Gemini API for analysis...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 5. 解析 AI 返回的 JSON 结果
    console.log("[AI Analyzer] AI response received. Parsing JSON...");
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
