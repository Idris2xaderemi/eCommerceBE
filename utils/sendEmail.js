const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async (options) => {
  // Skip if no recipient
  if (!options.email) {
    console.warn('sendEmail called without a recipient – skipping');
    return;
  }

  // Skip if SendGrid isn't configured
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SENDGRID_API_KEY not set – skipping email');
    return;
  }

  const msg = {
    to: options.email,
    from: {
      email: process.env.SMTP_EMAIL || 'noreply@karakata.com',
      name: 'KaraKata',
    },
    subject: options.subject,
    html: options.html,
  };

  try {
    await sgMail.send(msg);
    console.log('Email sent to', options.email);
  } catch (err) {
    console.error('SendGrid error:', err.response?.body || err.message);
  }
};

module.exports = sendEmail;