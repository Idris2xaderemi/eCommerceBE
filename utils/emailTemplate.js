const emailTemplate = (title, content, ctaText, ctaLink) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 0; background-color: #f4f6f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    .container { max-width: 580px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 35px 30px; text-align: center; }
    .header h1 { color: white; font-size: 26px; margin: 0; font-weight: 700; }
    .body { padding: 35px 30px; color: #334155; font-size: 16px; line-height: 1.6; }
    .body h2 { color: #1e293b; font-size: 20px; margin-top: 0; }
    .btn { display: inline-block; margin-top: 20px; padding: 14px 30px; background: #2563eb; color: white !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; }
    .footer { background: #f8fafc; padding: 20px 30px; text-align: center; color: #94a3b8; font-size: 13px; border-top: 1px solid #e2e8f0; }
    .divider { height: 1px; background: #e2e8f0; margin: 20px 0; }
    .highlight { color: #2563eb; font-weight: 600; }
    .address-box { background: #f8fafc; border-left: 4px solid #2563eb; padding: 15px; border-radius: 6px; margin: 15px 0; }
    ul { padding-left: 20px; }
    li { margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>KaraKata</h1>
    </div>
    <div class="body">
      <h2>${title}</h2>
      ${content}
      ${ctaText && ctaLink ? `<a href="${ctaLink}" class="btn">${ctaText}</a>` : ''}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} KaraKata. All rights reserved.</p>
      <p>This email was sent to you because you are a registered user of KaraKata.</p>
    </div>
  </div>
</body>
</html>
`;

module.exports = emailTemplate;