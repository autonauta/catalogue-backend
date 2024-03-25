const nodemailer = require("nodemailer");
const config = require("config");
const path = require("path");
const hbs = require("nodemailer-express-handlebars");

const user = config.get("mailUser");
const psw = config.get("mailPassword");
const server = config.get("mailServer");
const port = config.get("mailPort");

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

function sendPDFEmail(fileName, email, name) {
  return new Promise((resolve, reject) => {
    transporter.sendMail(
      {
        from: user,
        to: email,
        subject: "Cotización HighData",
        template: "confirmationEmail",
        context: { name },
        attachments: [
          {
            filename: fileName,
            path:
              "/home/autonauta/highdata/catalogue-backend/files/cotizaciones/" +
              fileName, // Asegúrate de reemplazar esto con la ruta real al PDF
          },
        ],
      },
      (err, info) => {
        if (err) {
          reject({ sent: false, error: err });
        } else {
          resolve({
            sent: true,
            response: `Correo enviado correctamente a ${email}: ${info.response}`,
          });
        }
      }
    );
  });
}
function sendNotifyEmail(name, potenciaRequerida, numPaneles, precioProyecto) {
  return new Promise((resolve, reject) => {
    transporter.sendMail(
      {
        from: user,
        to: "contacto@highdatamx.com",
        subject: "Nuevo lead!",
        template: "notifyEmail",
        context: { name, potenciaRequerida, numPaneles, precioProyecto },
      },
      (err, info) => {
        if (err) {
          reject({ sent: false, error: err });
        } else {
          resolve({
            sent: true,
            response: `Correo enviado correctamente a ${email}: ${info.response}`,
          });
        }
      }
    );
  });
}
function sendConfirmationEmail(
  email,
  phone,
  syscomOrderId,
  product,
  quantity,
  ammount,
  date
) {
  transporter.sendMail(
    {
      from: user,
      to: email,
      subject: "Pedido confirmado",
      template: "confirmationEmail",
      context: {
        phone,
        syscomOrderId,
        product,
        quantity,
        ammount,
        date,
      },
    },
    (err, inf) => {
      if (err) console.log(err);
      else
        console.log(`Correo enviado correctamente a ${email}: `, inf.response);
    }
  );
}
function sendTrackingEmail(
  email,
  syscomTracking,
  syscomOrderId,
  date,
  state,
  city,
  colony,
  street,
  numExt,
  numInt,
  phone
) {
  transporter.sendMail(
    {
      from: user,
      to: email,
      subject: "Pedido enviado",
      template: "trackingEmail",
      context: {
        syscomTracking,
        syscomOrderId,
        date,
        state,
        city,
        colony,
        street,
        numExt,
        numInt,
        phone,
      },
    },
    (err, inf) => {
      if (err) console.log(err);
      else
        console.log(`Correo enviado correctamente a ${email}: `, inf.response);
    }
  );
}

module.exports = {
  nodemailer,
  sendConfirmationEmail,
  sendTrackingEmail,
  sendPDFEmail,
  sendNotifyEmail,
};
