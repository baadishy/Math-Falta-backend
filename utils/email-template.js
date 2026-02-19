const createEmailTemplate = ({ name, grade, parentNumber }, link) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to Math-Falta</title>
</head>
<body style="margin:0; padding:0; background-color:#f6f6f8; font-family:Arial, Helvetica, sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f6f8; padding:20px 0;">
    <tr>
      <td align="center">

        <!-- Main Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:#135bec; padding:20px; text-align:center;">
              <span style="font-size:22px; font-weight:bold; color:#ffffff;">
                📘 Math-Falta
              </span>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td style="padding:30px 20px; text-align:center;">
              <h1 style="margin:0 0 10px; font-size:26px; color:#111827;">
                Welcome aboard, ${name || "Student"} 🎉
              </h1>
              <p style="margin:0; font-size:16px; color:#4b5563; line-height:1.6;">
                Your account has been successfully created.<br/>
                We’re excited to help you master mathematics!
              </p>
            </td>
          </tr>

          <!-- Details -->
          <tr>
            <td style="padding:0 20px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb; border-radius:8px; border:1px solid #e5e7eb;">
                
                <tr>
                  <td style="padding:12px 16px; font-size:14px; color:#6b7280;">
                    <strong style="color:#111827;">Student Name:</strong>
                    ${name || "Student"}
                  </td>
                </tr>

                <tr>
                  <td style="padding:12px 16px; font-size:14px; color:#6b7280; border-top:1px solid #e5e7eb;">
                    <strong style="color:#111827;">Grade Level:</strong>
                    ${grade || "Unknown"} Grade
                  </td>
                </tr>

                <tr>
                  <td style="padding:12px 16px; font-size:14px; color:#6b7280; border-top:1px solid #e5e7eb;">
                    <strong style="color:#111827;">Parent Phone:</strong>
                    +2${parentPhone || "—"}
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:20px;">
              <a href="${link}"
                style="
                  display:inline-block;
                  padding:14px 28px;
                  background-color:#135bec;
                  color:#ffffff;
                  text-decoration:none;
                  font-size:16px;
                  font-weight:bold;
                  border-radius:8px;
                ">
                Go to Dashboard →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px; text-align:center; font-size:12px; color:#9ca3af;">
              Need help? Contact our support team.<br/><br/>
              © 2025 Math-Falta. All rights reserved.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;
};

const emailTemplates = [
  {
    label: "Welcome Email",
    generateSubject: (name) => `Welcome to MathForMe, ${name || "there"}!`,
    generateBody: ({ name, grade, parentNumber }, link) => createEmailTemplate({ name, grade, parentNumber }, link),
  },
];

module.exports = { emailTemplates };
