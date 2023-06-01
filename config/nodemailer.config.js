import nodemailer from "nodemailer";
import config from "config";
import path from "path";
import hbs from "nodemailer-express-handlebars";

const user = config.mailUser;
const psw = config.mailPassword;
const server = config.mailServer;
const port = config.mailPort;

var transporter = nodemailer.createTransport({
    host: server,
    port: port,
    secure: true,
    auth: {
      user: user,
      pass: psw,
    },
  });
  
  const hbOptions = {
    viewEngine: {
      extName: ".handlebars",
      partialsDir: path.resolve("html"),
      defaultLayout: false,
    },
    viewPath: path.resolve("html"),
    extName: ".handlebars",
  };
  
  transporter.use("compile", hbs(hbOptions));

  export function sendConfirmationEmail(email, phone, syscomOrderId, product, quantity, ammount, date) {
    transporter.sendMail(
      {
        from: user,
        to: email,
        subject: "Pedido confirmado",
        template: "confirmationEmail",
        context: {
          email,
          phone,
          syscomOrderId,
          product,
          quantity,
          ammount, 
          date
        },
      },
      (err, inf) => {
        if (err) console.log(err);
        else console.log(`Correo enviado correctamente a ${email}: `, inf.response);
      }
    );
  };

  export default {nodemailer}