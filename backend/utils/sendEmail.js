const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Create a transporter using environment variables or a default testing config (like mailtrap)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: process.env.SMTP_PORT || 2525,
    auth: {
      user: process.env.SMTP_EMAIL || 'test_user',
      pass: process.env.SMTP_PASSWORD || 'test_password'
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
  const info = await transporter.sendMail(message);

  console.log('Message sent: %s', info.messageId);
};

module.exports = sendEmail;