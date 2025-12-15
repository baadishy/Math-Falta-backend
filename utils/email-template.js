const createEmailTemplate = (name, link) => {
  return `
  <div style="font-family: Arial, sans-serif; background:#f7f7ff; padding: 25px;">
    <div style="max-width: 500px; margin: auto; background: white; padding: 20px; border-radius: 10px;">

      <h2 style="color:#4e32a8; text-align:center;">
        🎉 Welcome to MathForMe!
      </h2>

      <p style="font-size: 16px;">
        Hi ${name || "there"},
      </p>

      <p style="font-size: 16px; line-height: 1.6;">
        We're excited to have you join <b>MathForMe</b> — your new place to master math with fun quizzes and easy lessons.
      </p>

      <p style="font-size: 16px; line-height: 1.6;">
        You can now log in and start exploring topics for your grade.
      </p>

      <div style="text-align:center; margin: 25px 0;">
        <a href="${link}"
           style="
            background:#4e32a8;
            color:white;
            padding:12px 25px;
            border-radius:8px;
            text-decoration:none;
            font-size:16px;">
          Go to Dashboard
        </a>
      </div>

      <p style="font-size: 14px; color:#777;">
        If you didn’t create this account, please ignore this email.
      </p>

    </div>
  </div>
  `;
};

const emailTemplates = [
  {
    label: "Welcome Email",
    generateSubject: (name) => `Welcome to MathForMe, ${name || "there"}!`,
    generateBody: (name, link) => createEmailTemplate(name, link),
  },
];

module.exports = { emailTemplates };
