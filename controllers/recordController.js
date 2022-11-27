var format = require('date-format');
const { validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const mailjetTransport = require('nodemailer-mailjet-transport');
const dotenv = require('dotenv');
const { Client } = require('pg');
const LocalStorage = require('node-localstorage').LocalStorage;

dotenv.config();

const client = new Client({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
  ssl: {
    rejectUnauthorized: false
  }
});

client.connect(err => {
  if (err) {
    console.error('connection error', err.stack)
  } else {
    console.log('record controller DB connected')
  }
})

exports.addRecordController = function (req, res) {

  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {

    // fetch all categories
    const categoriesQuery = 'SELECT id, title FROM category WHERE is_deleted = false';
    console.log('categoriesQuery')

    client.query(categoriesQuery, (err, data) => {

      if (err) {

        console.log(err);

      }
      else {

        console.log('fetch categories successful');
        const categories = data.rows;

        // fetch all sub-categories
        const subCategoriesQuery = 'SELECT id, category_id, title FROM sub_category WHERE is_deleted = false';

        client.query(subCategoriesQuery, (err, data) => {
          if (err) {

            console.log(err);

          }
          else {

            console.log('fetch sub-categories successful');
            const subCategories = data.rows;
         
            // init empty form
            const response = [];

            response["service_beneficiary_email"] = req.body.service_beneficiary_email;
            response["service_beneficiary_name"] = req.body.service_beneficiary_name;
            response["service_provider_email"] = req.body.service_provider_email;
            response["service_provider_name"] = req.body.service_provider_name;
            response["service_description"] = req.body.service_description;
            response["hours"] = req.body.hours;
            response["minutes"] = req.body.minutes;
            response["category"] = req.body.category;
            response["sub-category"] = req.body.sub_category;

            res.render('index', { errors: errors.array(), response, categories, subCategories });

          }
        });
      }
    });
  }

  else {

    console.log('processing adding records ...');

    const newRecord = {
      date: format('dd/mm/yyyy hh:mm:ss', new Date()),
      beneficiaryName: req.body.service_beneficiary_name,
      beneficiaryEmail: req.body.service_beneficiary_email,
      providerName: req.body.service_provider_name,
      providerEmail: req.body.service_provider_email,
      description: req.body.service_description,
      hours: req.body.hours,
      minutes: req.body.minutes,
      category: req.body.category,
      subCategory: req.body.sub_category,
      user_agent: req.headers['user-agent'],
      user_ip: req.socket.remoteAddress,
    };

    const now = new Date();
    const mutation = 'INSERT INTO timecheck( date, beneficiary_name, beneficiary_email, provider_name, provider_email, description, hours, minutes, category, sub_category, user_agent, user_ip ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *';
    const values = [
      newRecord.date,
      newRecord.beneficiaryName,
      newRecord.beneficiaryEmail,
      newRecord.providerName,
      newRecord.providerEmail,
      newRecord.description,
      newRecord.hours,
      newRecord.minutes,
      newRecord.category,
      newRecord.subCategory,
      newRecord.user_agent,
      newRecord.user_ip,
    ];

    client.query(mutation, values, (err, ret) => {

      if (err) {
        console.log(err)

        const response = [];
        response["service_beneficiary_email"] = '';
        response["service_provider_email"] = '';
        response["service_description"] = '';
        response["hours"] = '';
        response["minutes"] = '';
        response["categories"] = '';
        response["sub-category"] = '';

        const subCategories = data.rows;

        return res.render('index', {
          response: response,
          error: 'une erreur est survenue lors de l\'enregistrement. Veuillez contacter l\'accorderie'
        });
      }
      else {
        console.log('record added successfully.')

        if (process.env.NODE_ENV !== 'development') {
          sendMailToBeneficiary(
            newRecord.date,
            newRecord.beneficiaryName,
            newRecord.beneficiaryEmail,
            newRecord.providerName,
            newRecord.providerEmail,
            newRecord.description,
            newRecord.hours,
            newRecord.minutes,
            newRecord.category,
            newRecord.subCategory,
          );

          sendMailToProvider(
            newRecord.date,
            newRecord.beneficiaryName,
            newRecord.beneficiaryEmail,
            newRecord.providerName,
            newRecord.providerEmail,
            newRecord.description,
            newRecord.hours,
            newRecord.minutes,
            newRecord.category,
            newRecord.subCategory,
          );

          sendMailToLaccorderie(
            newRecord.date,
            newRecord.beneficiaryName,
            newRecord.beneficiaryEmail,
            newRecord.providerName,
            newRecord.providerEmail,
            newRecord.description,
            newRecord.hours,
            newRecord.minutes,
            newRecord.category,
            newRecord.subCategory,
          );
        }

        if (process.env.NODE_ENV == 'development') {
          sendMailTest(
            newRecord.date,
            newRecord.beneficiaryName,
            newRecord.beneficiaryEmail,
            newRecord.providerName,
            newRecord.providerEmail,
            newRecord.description,
            newRecord.hours,
            newRecord.minutes,
            newRecord.category,
            newRecord.subCategory,
          );
        }


        const msg = 'Votre chèque a été ajouté avec succès. Un email de confirmation a été envoyé à la boite mail des protagonistes ainsi qu\'à celle de l\'accorderie.';

        localStorage = new LocalStorage('./scratch');
        localStorage.setItem('msg', msg);

        const url = require('url');
        res.redirect(url.format({
          pathname: "/",
          query: {}
        }));

      }
    })
  }
};

function sendMailToBeneficiary(
  date,
  beneficiary_name,
  beneficiary_email,
  providerName,
  providerEmail,
  description,
  hours,
  minutes,
  category,
  sub_category
) {
  const transport = nodemailer.createTransport(mailjetTransport({
    auth: {
      apiKey: process.env.MAILJETAPIKEY,
      apiSecret: process.env.MAILJETSECRETKEY
    }
  }));
  const mail = {
    from: process.env.EMAILACCODERIE,
    to: beneficiary_email,
    subject: 'Nouvel enregistrement d\'un chèque temps : à ' + beneficiary_name + ',  par ' + providerName + ' le ' + date,

    html: '<p>Bonjour,</p><p>Un nouveau chèque temps de <b>' + beneficiary_name + ' ' + beneficiary_email + '</b> rendu par <b>' + providerName + ' ' + providerEmail + '</b> ,</p> <p>Categorie:' + category + ' - ' + sub_category + ' </p>  <p> pour le service: <p><b>"' + description + '"</b></p>, le <b>' + date + '</b>, dont la durée est de <b>' + hours + 'h. ' + minutes + 'min.</b></p></b></p></br></br></br><p><a target="_blank" href="https://accorderie-des-bauges.up.railway.app/">Page d\'ajout de cheque temps</a></p>'
  };

  try {
    transport.sendMail(mail);
    console.log('email sent to ' + beneficiary_email);

  } catch (err) {
    console.error(err);

    return res.render('index', {
      msg: 'Erreur de serveur email. Le bénéficiaire ne recevera pas d\'email de confirmation'
    });
  }
};

function sendMailToProvider(
  date,
  beneficiary_name,
  beneficiary_email,
  providerName,
  providerEmail,
  description,
  hours,
  minutes,
  category,
  sub_category
) {
  const transport = nodemailer.createTransport(mailjetTransport({
    auth: {
      apiKey: process.env.MAILJETAPIKEY,
      apiSecret: process.env.MAILJETSECRETKEY
    }
  }));
  const mail = {
    from: process.env.EMAILACCODERIE,
    to: providerEmail,

    subject: 'Nouvel enregistrement d\'un chèque temps : à ' + beneficiary_name + ',  par ' + providerName + ' le ' + date,

    html: '<p>Bonjour,</p><p>Un nouveau chèque temps de <b>' + beneficiary_name + ' ' + beneficiary_email + '</b> rendu par <b>' + providerName + ' ' + providerEmail + '</b> ,</p> <p>Categorie:' + category + ' - ' + sub_category + ' </p>  <p> pour le service: <p><b>"' + description + '"</b></p>, le <b>' + date + '</b>, dont la durée est de <b>' + hours + 'h. ' + minutes + 'min.</b></p></b></p></br></br></br><p><a target="_blank" href="https://accorderie-des-bauges.up.railway.app/">Page d\'ajout de cheque temps</a></p>'
  };

  try {
    transport.sendMail(mail);
    console.log('email sent to ' + providerEmail);
  } catch (err) {
    console.error(err);

    return res.render('index', {
      msg: 'Erreur de serveur email. L\'accordeur ne recevera pas d\'email de confirmation'
    });

  }
};

function sendMailToLaccorderie(
  date,
  beneficiary_name,
  beneficiary_email,
  providerName,
  providerEmail,
  description,
  hours,
  minutes,
  category,
  sub_category
) {

  const transport = nodemailer.createTransport(mailjetTransport({
    auth: {
      apiKey: process.env.MAILJETAPIKEY,
      apiSecret: process.env.MAILJETSECRETKEY
    }
  }));
  const mail = {
    from: process.env.EMAILACCODERIE,
    to: process.env.EMAILACCODERIE,
    subject: 'Nouvel enregistrement d\'un chèque temps : à ' + beneficiary_name + ' par ' + providerName + ' le ' + date,

    html: '<p>Bonjour,</p><p>Un nouveau chèque temps de <b>' + beneficiary_name + ' ' + beneficiary_email + '</b> rendu par <b>' + providerName + ' ' + providerEmail + '</b> ,</p> <p>Categorie:' + category + ' - ' + sub_category + ' </p>  <p> pour le service: <p><b>"' + description + '"</b></p>, le <b>' + date + '</b>, dont la durée est de <b>' + hours + 'h. ' + minutes + 'min.</b></p></b></p></br></br></br><p><a target="_blank" href="https://accorderie-des-bauges.up.railway.app/">Page d\'ajout de cheque temps</a></p>'
  };

  try {
    transport.sendMail(mail);
    console.log('email sent to ' + process.env.EMAILACCODERIE );
  } catch (err) {

    console.error(err);

    return res.render('index', {
      msg: 'Erreur de serveur email. Veuillez contacter l\'accorderie pour signaler votre enregistrement'
    });
  }
};

function sendMailTest(
  date,
  beneficiary_name,
  beneficiary_email,
  providerName,
  providerEmail,
  description,
  hours,
  minutes,
  category,
  sub_category
) {

  const transport = nodemailer.createTransport(mailjetTransport({
    auth: {
      apiKey: process.env.MAILJETAPIKEY,
      apiSecret: process.env.MAILJETSECRETKEY
    }
  }));
  const mail = {
    from: process.env.EMAIL_TEST,
    to: process.env.EMAIL_TEST,
    subject: 'Nouvel enregistrement d\'un chèque temps : à ' + beneficiary_name + ' par ' + providerName + ' le ' + date,

    html: '<p>Bonjour,</p><p>Un nouveau chèque temps de <b>' + beneficiary_name + ' ' + beneficiary_email + '</b> rendu par <b>' + providerName + ' ' + providerEmail + '</b> ,</p> <p>Categorie:' + category + ' - ' + sub_category + ' </p>  <p> pour le service: <p><b>"' + description + '"</b></p>, le <b>' + date + '</b>, dont la durée est de <b>' + hours + 'h. ' + minutes + 'min.</b></p></b></p></br></br></br><p><a target="_blank" href="https://accorderie-des-bauges.up.railway.app/">Page d\'ajout de cheque temps</a></p>'
  };

  try {
    transport.sendMail(mail);
    console.log('email sent to ' + process.env.EMAIL_TEST );
  } catch (err) {
    console.error(err.message);

    return res.render('index', {
      msg: 'Erreur de serveur email. Test message'
    });
  }
};
