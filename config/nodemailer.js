const nodeMailer = require("nodemailer");
const { EMAIL_ACCOUNT, EMAIL_PASSWORD } = require("./env");

const transporter = nodeMailer.createTransport({
  service: "Gmail",
  auth: {
    user: EMAIL_ACCOUNT,
    pass: EMAIL_PASSWORD,
  },
});

module.exports = transporter;