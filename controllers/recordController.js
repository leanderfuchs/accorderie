var fs = require('fs');
var format = require('date-format');
const { validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const mailjetTransport = require('nodemailer-mailjet-transport');

var path = require('path');
const FILES_DIR = path.resolve('./public/files');;

exports.addRecordController = function (req, res, body) 
{
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.render('index', { errors: errors.array(), response: req.body });
    }

    console.log('processing adding records ...');

    const newRecord = {
        id : null,
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

  
    if (fs.existsSync( FILES_DIR + '/registrations.json')) 
    {
      console.log('file exists');
    } 
    else 
    {
      console.log('file missing');

      fs.writeFile(FILES_DIR + '/registrations.json', '', function(err) 
      {
        if(err) {
            console.log(err);
        }
        console.log("File saved!");

        fs.appendFile( FILES_DIR + '/registrations.json', '[]', err => 
        {
          if (err) 
          {
            console.error(err);
          }
          console.log("File content created");
        });
      });
    }

    fs.readFile( FILES_DIR + '/registrations.json', 'utf8', (err, data) => 
    {

        console.log('file read successfully ...');

        const file = JSON.parse(data);
        
        var lastRecord = file[Object.keys(file)[Object.keys(file).length - 1]];
        if( !lastRecord ) 
        {
          newRecord.id = 1;
        } 
        else 
        {
          newRecord.id = lastRecord.id +1;
        }

        file.push(newRecord);

        fs.writeFile( FILES_DIR + '/registrations.json', JSON.stringify(file), err => {
            if (err) {
                console.error(err);
                return res.sendStatus(400).render('index').send({ error: 'Désolé, une erreur d\'enregistrement est survenue. Vous pouvez recommencer ou nous appeler au 0749702058 !' })
            }

            console.log('record added successfully ...');            

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

            if (process.env.NODE_ENV == 'development') {
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

            return res.render('index', {response : response, msg: 'Votre chèque a été ajouté avec succès. Un email de confirmation a été envoyé à la boite mail des protagonistes ainsi qu\'à celle de l\'accorderie.'});
        });
    });

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

            subject: 'Nouvel enregistrement d\'un chèque temps : à ' + beneficiary + ' par ' + provider +' le '+ date ,

            html: '<p>Bonjour,</p><p>Un nouveau chèque temps de <b>'+ beneficiary +'</b> rendu par <b>'+ provider +'</b> ,</p><p> pour le service: <p><b>"'+ description +'"</b></p>, le <b>'+ date +'</b>, dont la durée est de <b>'+ hours +'h. '+ minutes +'min.</b></p>'
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
            
            subject: 'Nouvel enregistrement d\'un chèque temps : à ' + beneficiary + ' par ' + provider +' le '+ date ,

            html: '<p>Bonjour,</p><p>Un nouveau chèque temps de <b>'+ beneficiary +'</b> rendu par <b>'+ provider +'</b> ,</p><p> pour le service: <p><b>"'+ description +'"</b></p>, le <b>'+ date +'</b>, dont la durée est de <b>'+ hours +'h. '+ minutes +'min.</b></p>'
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
            subject: 'Nouvel enregistrement d\'un chèque temps : à ' + beneficiary + ' par ' + provider +' le '+ date ,

            html: '<p>Bonjour,</p><p>Un nouveau chèque temps de <b>'+ beneficiary +'</b> rendu par <b>'+ provider +'</b> ,</p><p> pour le service: <p><b>"'+ description +'"</b></p>, le <b>'+ date +'</b>, dont la durée est de <b>'+ hours +'h. '+ minutes +'min.</b></p>'
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
            subject: 'Nouvel enregistrement d\'un chèque temps : à ' + beneficiary + ' par ' + provider +' le '+ date ,

            html: '<p>Bonjour,</p><p>Un nouveau chèque temps de <b>'+ beneficiary +'</b> rendu par <b>'+ provider +'</b> ,</p><p> pour le service: <p><b>"'+ description +'"</b></p>, le <b>'+ date +'</b>, dont la durée est de <b>'+ hours +'h. '+ minutes +'min.</b></p>'
          };

          try {
            const info = transport.sendMail(mail);
          } catch (err) {
            console.error(err);
          }
    };
};
