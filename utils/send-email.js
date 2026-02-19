const { emailTemplates } = require("./email-template");
const transporter = require("../config/nodemailer");
const { EMAIL_ACCOUNT } = require("../config/env");

const sendEmail = async (to, label, link, { name, grade, parentNumber }) => {
  try {
    const template = emailTemplates.find((t) => t.label === label);

    const mailOptions = {
      from: EMAIL_ACCOUNT,
      to,
      subject: template.generateSubject(name),
      html: template.generateBody({ name, grade, parentNumber }, link),
    };

    await transporter.sendMail(mailOptions);

    console.log(`Email sent to ${to} with label ${label}`);
  } catch (error) {
    console.log("Error sending email:", error);
  }
};

module.exports = sendEmail;