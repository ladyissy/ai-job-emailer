const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

/**
 * 将 AI 分析结果格式化为 HTML 邮件并发送
 * @param {object} analysisResult - 从 ai_analyzer.js 获取的包含 ranked_jobs 数组的对象
 */
async function sendReportEmail(analysisResult, recipientEmail) {
  console.log("[Email Sender] 开始发送求职报告邮件...");

  // --- 邮件服务配置 (重要！) ---
  // 您需要一个支持 SMTP 的邮箱服务来发送邮件。
  // 这里以 Gmail 为例，您需要为您的 Google 账号开启 "两步验证"
  // 然后生成一个 "应用专用密码 (App Password)"。
  // 教程: https://support.google.com/accounts/answer/185833
  // 不要在这里使用您的真实登录密码！
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: "euphoric.skycraper@gmail.com", // 替换成您的 Gmail 地址
      pass: "rhsbfnwhdernbity", // 替换成您的16位应用专用密码
    },
  });

  // 2. 将 AI 结果格式化为漂亮的 HTML
  const generateHtmlContent = (data) => {
    let jobRows = data.ranked_jobs
      .map(
        (job) => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                    <a href="${job.link}" style="color: #007bff; text-decoration: none; font-weight: bold;">${job.title}</a>
                    <div style="font-size: 14px; color: #555;">${job.company}</div>
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${job.match_score}/100</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${job.reason}</td>
            </tr>
        `
      )
      .join("");

    return `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h1 style="color: #333;">每日 AI 求职报告</h1>
                <p>早上好！您的 AI 求职助手已为您筛选出今天最匹配的 ${data.ranked_jobs.length} 个职位：</p>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #f2f2f2;">
                            <th style="padding: 10px; text-align: left;">职位 / 公司</th>
                            <th style="padding: 10px; text-align: center;">匹配度</th>
                            <th style="padding: 10px; text-align: left;">AI 推荐理由</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${jobRows}
                    </tbody>
                </table>
                <p style="margin-top: 20px; font-size: 12px; color: #888;">
                    报告由 AI Job Hunter 自动生成。
                </p>
            </div>
        `;
  };

  const htmlContent = generateHtmlContent(analysisResult);
  const today = new Date().toLocaleDateString("zh-CN");

  // 3. 定义邮件内容
  const mailOptions = {
    from: '"AI 求职助手" <YOUR_GMAIL_ADDRESS@gmail.com>', // 发件人显示名称和地址
    to: recipientEmail, // 收件人
    subject: `[AI 求职报告] ${today} - 为您找到最匹配的职位`, // 邮件标题
    html: htmlContent, // 邮件正文 (HTML格式)
  };

  // 4. 发送邮件
  try {
    let info = await transporter.sendMail(mailOptions);
    console.log(
      `[Email Sender] 报告邮件已成功发送! Message ID: ${info.messageId}`
    );
    return info;
  } catch (error) {
    console.error("[Email Sender] 发送邮件时出错:", error);
    console.error(
      "--- 请检查您的 nodemailer 配置 (邮箱地址和应用专用密码) 是否正确 ---"
    );
    throw error;
  }
}

module.exports = { sendReportEmail };
