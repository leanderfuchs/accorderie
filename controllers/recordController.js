var format = require('date-format');
const { validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const mailjetTransport = require('nodemailer-mailjet-transport');
const dotenv = require('dotenv');
const { Client } = require('pg')

dotenv.config();

const client = new Client({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

if (process.env.NODE_ENV !== 'development'){
    client.ssl = {rejectUnauthorized: false};
}

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
    ref: req.body.reference,
    user_agent: req.headers['user-agent'],
    user_ip: req.socket.remoteAddress
  };

  const now = new Date();
  const mutation = 'INSERT INTO timecheck( date, beneficiary, provider, description, hours, minutes, ref, user_agent, user_ip, updated_at ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *';
  const values = [newRecord.date, newRecord.beneficiary, newRecord.provider, newRecord.description, newRecord.hours, newRecord.minutes, newRecord.ref, newRecord.user_agent, newRecord.user_ip, now];

  client.query(mutation, values, (err, ret) => {
    
    if (err) 
    {
      const response = [];
      response["service_beneficiary_email"] = '';
      response["service_provider_email"] = '';
      response["service_description"] = '';
      response["hours"] = '';
      response["minutes"] = '';
      response["reference"] = '';
      
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
          newRecord.minutes,
          newRecord.ref
        );

        sendMailToProvider(
          newRecord.date,
          newRecord.beneficiary,
          newRecord.provider,
          newRecord.description,
          newRecord.hours,
          newRecord.minutes,
          newRecord.ref
        );

        sendMailToLaccorderie(
          newRecord.date,
          newRecord.beneficiary,
          newRecord.provider,
          newRecord.description,
          newRecord.hours,
          newRecord.minutes,
          newRecord.ref
        );
      }

      if (process.env.NODE_ENV !== 'development') {
        sendMailTest(
          newRecord.date,
          newRecord.beneficiary,
          newRecord.provider,
          newRecord.description,
          newRecord.hours,
          newRecord.minutes,
          newRecord.ref
        );
      }

      const response = [];
      response["service_beneficiary_email"] = '';
      response["service_provider_email"] = '';
      response["service_description"] = '';
      response["hours"] = '';
      response["minutes"] = '';
      response["reference"] = '';

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
  ref
) {
  console.log('Sending email to beneficiary');

  const transport = nodemailer.createTransport(mailjetTransport({
    auth: {
      apiKey: process.env.MAILJETAPIKEY,
      apiSecret: process.env.MAILJETSECRETKEY
    }
  }));
  const mail = {
    from: process.env.EMAILACCODERIE,
    to: beneficiary,

    subject: 'Nouvel enregistrement d\'un chèque temps : à ' + beneficiary + ' par ' + provider + ' le ' + date,

    html: '<p>Bonjour,</p><p>Un nouveau chèque temps de <b>' + beneficiary + '</b> rendu par <b>' + provider + '</b> ,</p><p> pour le service: <p><b>"' + description + '"</b></p>, le <b>' + date + '</b>, dont la durée est de <b>' + hours + 'h. ' + minutes + 'min.</b></p>'
  };

  try {
    const info = transport.sendMail(mail);
  } catch (err) {
    console.error(err);
  }
};

function sendMailToProvider(
  date,
  beneficiary,
  provider,
  description,
  hours,
  minutes,
  ref
) {
  console.log('Sending email to provider');

  const transport = nodemailer.createTransport(mailjetTransport({
    auth: {
      apiKey: process.env.MAILJETAPIKEY,
      apiSecret: process.env.MAILJETSECRETKEY
    }
  }));
  const mail = {
    from: process.env.EMAILACCODERIE,
    to: provider,

    subject: 'Nouvel enregistrement d\'un chèque temps : à ' + beneficiary + ' par ' + provider + ' le ' + date,

    html: '<p>Bonjour,</p><p>Un nouveau chèque temps de <b>' + beneficiary + '</b> rendu par <b>' + provider + '</b> ,</p><p> pour le service: <p><b>"' + description + '"</b></p>, le <b>' + date + '</b>, dont la durée est de <b>' + hours + 'h. ' + minutes + 'min.</b></p>'
  };

  try {
    const info = transport.sendMail(mail);
  } catch (err) {
    console.error(err);
  }
};

function sendMailToLaccorderie(
  date,
  beneficiary,
  provider,
  description,
  hours,
  minutes,
  ref
) {
  console.log('Sending email to l\'accorderie');

  const transport = nodemailer.createTransport(mailjetTransport({
    auth: {
      apiKey: process.env.MAILJETAPIKEY,
      apiSecret: process.env.MAILJETSECRETKEY
    }
  }));
  const mail = {
    from: process.env.EMAILACCODERIE,
    to: process.env.EMAILACCODERIE,
    subject: 'Nouvel enregistrement d\'un chèque temps : à ' + beneficiary + ' par ' + provider + ' le ' + date,

    html: '<p>Bonjour,</p><p>Un nouveau chèque temps de <b>' + beneficiary + '</b> rendu par <b>' + provider + '</b> ,</p><p> pour le service: <p><b>"' + description + '"</b></p>, le <b>' + date + '</b>, dont la durée est de <b>' + hours + 'h. ' + minutes + 'min.</b></p></br></br></br><p><a target="_blank" href="https://accorderie.herokuapp.com/accorderie-records-list-for-admins">Lien vers la liste des cheques temps</a></p>'
  };

  try {
    const info = transport.sendMail(mail);
  } catch (err) {
    console.error(err);
  }
};

function sendMailTest(
  date,
  beneficiary,
  provider,
  description,
  hours,
  minutes,
  ref
) {
  console.log('Sending email to Leander');

  const transport = nodemailer.createTransport(mailjetTransport({
    auth: {
      apiKey: process.env.MAILJETAPIKEY,
      apiSecret: process.env.MAILJETSECRETKEY
    }
  }));
  const mail = {
    from: process.env.EMAILLEANDER,
    to: process.env.EMAILLEANDER,
    subject: 'Nouvel enregistrement d\'un chèque temps : à ' + beneficiary + ' par ' + provider + ' le ' + date,

    html: '<p>Bonjour,</p><p>Un nouveau chèque temps de <b>' + beneficiary + '</b> rendu par <b>' + provider + '</b> ,</p><p> pour le service: <p><b>"' + description + '"</b></p>, le <b>' + date + '</b>, dont la durée est de <b>' + hours + 'h. ' + minutes + 'min.</b></p></br></br></br><p><a target="_blank" href="https://laccoderie.herokuapp.com/accorderie-records-list-for-admins">Lien vers la liste des cheques temps</a></p>'
  };

  try {
    const info = transport.sendMail(mail);
  } catch (err) {
    console.error(err);
  }
};