import nodemailer from "nodemailer";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Create nodemailer transporter for email sending
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // app password (NOT real password)
  },
});

// Legacy function for backward compatibility
export async function sendEmail(to: string, subject: string, text: string) {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  });

  return `✅ Email sent to ${to}`;
}

// LangChain EmailToolkit - Automated email sending tool
export const emailToolkit = tool(
  async ({ to, subject, message, cc, bcc }) => {
    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        text: message,
      };

      if (cc) mailOptions.cc = cc;
      if (bcc) mailOptions.bcc = bcc;

      await transporter.sendMail(mailOptions);
      return `✅ Email successfully sent to ${to}${cc ? ` (CC: ${cc})` : ""}${bcc ? ` (BCC: ${bcc})` : ""}`;
    } catch (error: any) {
      return `❌ Failed to send email: ${error.message}`;
    }
  },
  {
    name: "send_email",
    description:
      "Send an email to one or more recipients. Provide recipient email address(es), subject line, and message body. Optionally include CC and BCC recipients. Returns confirmation message.",
    schema: z.object({
      to: z.string().describe("Recipient email address(es), comma-separated for multiple recipients"),
      subject: z.string().describe("Email subject line"),
      message: z.string().describe("Email message body/content"),
      cc: z.string().optional().describe("CC recipient email address(es), comma-separated"),
      bcc: z.string().optional().describe("BCC recipient email address(es), comma-separated"),
    }),
  }
);

export { transporter };
