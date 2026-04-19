const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || process.env.SMTP_EMAIL;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error(
      'SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER (or SMTP_EMAIL), and SMTP_PASSWORD in backend/.env'
    );
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: {
      user,
      pass
    }
  });

  // Define the email options
  const message = {
    from: `${process.env.FROM_NAME || 'FYP System'} <${process.env.FROM_EMAIL || 'noreply@fypsystem.com'}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html
  };

  // Send the email
  try {
    const info = await transporter.sendMail(message);
    console.log('Message sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Email send failed:', error.message);
    throw error;
  }
};

const sendProjectCompletionEmail = async (email, projectTitle, teamMemberName) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 8px;">
      <h2 style="color: #0f4c81; margin-bottom: 20px;">🎉 Project Completion Notification</h2>
      <p>Dear ${teamMemberName},</p>
      <p>We are delighted to inform you that the project <strong>"${projectTitle}"</strong> has been <span style="color: #2a9d8f; font-weight: bold;">successfully completed</span>!</p>
      <div style="background: white; padding: 15px; border-left: 4px solid #0f4c81; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px;">Your dedication, collaboration, and outstanding work have been crucial to the success of this project. Thank you for being an integral part of the team!</p>
      </div>
      <p>You can view all project details and documentation through your dashboard.</p>
      <p style="margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 15px;">
        Best regards,<br>
        <strong>FYP Management System</strong><br>
        ${new Date().getFullYear()}
      </p>
    </div>
  `;

  try {
    await sendEmail({
      email,
      subject: `🎉 Project Completed: ${projectTitle}`,
      html
    });
  } catch (error) {
    console.error('Error sending project completion email:', error);
  }
};

module.exports = { sendEmail, sendProjectCompletionEmail };