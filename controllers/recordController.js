var format = require('date-format');
const { validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const mailjetTransport = require('nodemailer-mailjet-transport');
const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config();

const client = new Client({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
  // ssl: {
  //   rejectUnauthorized: false
  // }
});

client.connect(err => {
  if (err) {
    console.error('connection error', err.stack)
  } else {
    console.log('connected')
  }
})

exports.addRecordController = function (req, res, body) {

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.render('index', { errors: errors.array(), response: req.body });
  }

  console.log('processing adding records ...');

  const newRecord = {
    id: null,
    date: format('dd/mm/yyyy hh:mm:ss', new Date()),
    beneficiary: req.body.service_beneficiary_email,
    provider: req.body.service_provider_email,
    description: req.body.service_description,
    hours: req.body.hours,
    minutes: req.body.minutes,
    user_agent: req.headers['user-agent'],
    user_ip: req.socket.remoteAddress
  };

  const now = new Date();
  const mutation = 'INSERT INTO timecheck( date, beneficiary, provider, description, hours, minutes, user_agent, user_ip ) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *';
  const values = [newRecord.date, newRecord.beneficiary, newRecord.provider, newRecord.description, newRecord.hours, newRecord.minutes, newRecord.user_agent, newRecord.user_ip];

  client.query(mutation, values, (err, ret) => {
    
    if (err) 
    {
      const response = [];
      response["service_beneficiary_email"] = '';
      response["service_provider_email"] = '';
      response["service_description"] = '';
      response["hours"] = '';
      response["minutes"] = '';
      
      console.log(err)

      return res.render('index', {
        response: response, 
        error: 'une erreur est survenue lors de l\'enregistrement. Veuillez contacter l\'accorderie' 
      });
    }
    else 
    {
      console.log('record added successfully.')

      if (process.env.NODE_ENV !== 'development') {
        sendMailToBeneficiary(
          newRecord.date,
          newRecord.beneficiary,
          newRecord.provider,
          newRecord.description,
          newRecord.hours,
          newRecord.minutes
        );

        sendMailToProvider(
          newRecord.date,
          newRecord.beneficiary,
          newRecord.provider,
          newRecord.description,
          newRecord.hours,
          newRecord.minutes
        );

        sendMailToLaccorderie(
          newRecord.date,
          newRecord.beneficiary,
          newRecord.provider,
          newRecord.description,
          newRecord.hours,
          newRecord.minutes
        );
      }

      if (process.env.NODE_ENV == 'development') {
        sendMailTest(
          newRecord.date,
          newRecord.beneficiary,
          newRecord.provider,
          newRecord.description,
          newRecord.hours,
          newRecord.minutes
        );
      }

      const response = [];
      response["service_beneficiary_email"] = '';
      response["service_provider_email"] = '';
      response["service_description"] = '';
      response["hours"] = '';
      response["minutes"] = '';

      return res.render('index', { 
        response: response, 
        msg: 'Votre chèque a été ajouté avec succès. Un email de confirmation a été envoyé à la boite mail des protagonistes ainsi qu\'à celle de l\'accorderie.' 
      });
    }
  })
};

function sendMailToBeneficiary(
  date,
  beneficiary,
  provider,
  description,
  hours,
  minutes,
) {
  console.log('Sending email to beneficiary');

  const transport = nodemailer.createTransport(mailjetTransport({
    auth: {
      apiKey: process.env.MAILJETAPIKEY,
      apiSecret: process.env.MAILJETSECRETKEY
    }
  }));
  const mail = {
    from: process.env.EMAIL_ACCORDERIE,
    to: beneficiary,

    subject: 'Nouvel enregistrement d\'un chèque temps : à ' + beneficiary + ' par ' + provider + ' le ' + date,

    html: '<p>Bonjour,</p><p>Un nouveau chèque temps de <b>' + beneficiary + '</b> rendu par <b>' + provider + '</b> ,</p><p> pour le service: <p><b>"' + description + '"</b></p>, le <b>' + date + '</b>, dont la durée est de <b>' + hours + 'h. ' + minutes + 'min.</b></p>'
  };

  try {
    const info = transport.sendMail(mail);
  } catch (err) {
    console.error(err);

    return res.render('index', { 
      msg: 'Erreur de serveur email. Le bénéficiaire ne recevera pas d\'email de confirmation' 
    });
  }
};

function sendMailToProvider(
  date,
  beneficiary,
  provider,
  description,
  hours,
  minutes,
) {
  console.log('Sending email to provider');

  const transport = nodemailer.createTransport(mailjetTransport({
    auth: {
      apiKey: process.env.MAILJETAPIKEY,
      apiSecret: process.env.MAILJETSECRETKEY
    }
  }));
  const mail = {
    from: process.env.EMAIL_ACCORDERIE,
    to: provider,

    subject: 'Nouvel enregistrement d\'un chèque temps : à ' + beneficiary + ' par ' + provider + ' le ' + date,

    html: '<p>Bonjour,</p><p>Un nouveau chèque temps de <b>' + beneficiary + '</b> rendu par <b>' + provider + '</b> ,</p><p> pour le service: <p><b>"' + description + '"</b></p>, le <b>' + date + '</b>, dont la durée est de <b>' + hours + 'h. ' + minutes + 'min.</b></p>'
  };

  try {
    const info = transport.sendMail(mail);
  } catch (err) {
    console.error(err);

    return res.render('index', { 
      msg: 'Erreur de serveur email. L\'accordeur ne recevera pas d\'email de confirmation' 
    });

  }
};

function sendMailToLaccorderie(
  date,
  beneficiary,
  provider,
  description,
  hours,
  minutes,
) {
  console.log('Sending email to l\'accorderie');

  const transport = nodemailer.createTransport(mailjetTransport({
    auth: {
      apiKey: process.env.MAILJETAPIKEY,
      apiSecret: process.env.MAILJETSECRETKEY
    }
  }));
  const mail = {
    from: process.env.EMAIL_ACCORDERIE,
    to: process.env.EMAIL_ACCORDERIE,
    subject: 'Nouvel enregistrement d\'un chèque temps : à ' + beneficiary + ' par ' + provider + ' le ' + date,

    html: '<p>Bonjour,</p><p>Un nouveau chèque temps de <b>' + beneficiary + '</b> rendu par <b>' + provider + '</b> ,</p><p> pour le service: <p><b>"' + description + '"</b></p>, le <b>' + date + '</b>, dont la durée est de <b>' + hours + 'h. ' + minutes + 'min.</b><b>Services Individuels</b></p></br></br></br><p><a target="_blank" href="https://accorderie.herokuapp.com/accorderie-records-list-for-admins">Lien vers la liste des cheques temps</a></p>'
  };

  try {
    const info = transport.sendMail(mail);
  } catch (err) {

    console.error(err);

    return res.render('index', { 
      msg: 'Erreur de serveur email. Veuillez contacter l\'accorderie pour signaler votre enregistrement' 
    });
  }
};

function sendMailTest(
  date,
  beneficiary,
  provider,
  description,
  hours,
  minutes,
) {
  console.log('Sending email to tester');

  const transport = nodemailer.createTransport(mailjetTransport({
    auth: {
      apiKey: process.env.MAILJETAPIKEY,
      apiSecret: process.env.MAILJETSECRETKEY
    }
  }));
  const mail = {
    from: process.env.EMAIL_TEST,
    to: process.env.EMAIL_TEST,
    subject: 'Nouvel enregistrement d\'un chèque temps : à ' + beneficiary + ' par ' + provider + ' le ' + date,

    html: '<p>Bonjour,</p><p>Un nouveau chèque temps de <b>' + beneficiary + '</b> rendu par <b>' + provider + '</b> ,</p><p> pour le service: <p><b>"' + description + '"</b></p>, le <b>' + date + '</b>, dont la durée est de <b>' + hours + 'h. ' + minutes + 'min.</b></p></br></br></br><p><a target="_blank" href="https://accorderie.herokuapp.com/accorderie-records-list-for-admins">Lien vers la liste des cheques temps</a></p>'
  };

  try {
    const info = transport.sendMail(mail);
  } catch (err) {
    console.error(err);

    return res.render('index', { 
      msg: 'Erreur de serveur email. Test message' 
    });
  }
};