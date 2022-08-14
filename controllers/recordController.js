var fs = require('fs');
var format = require('date-format');
const { validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const mailjetTransport = require('nodemailer-mailjet-transport');

exports.addRecord = function (req, res, body) 
{
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.render('index', { errors: errors.array(), response: req.body });
    }

    console.log('processing adding records ...');

    const newRecord = {
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

    fs.readFile(process.env.FILES_FOLDER + 'registrations.json', 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.sendStatus(400).send({ error: 'Désolé, une erreur de lecture est survenue. Vous pouvez recommencer ou nous appeler au 0749702058 !' })
        }
        console.log('file read successfully ...');

        const file = JSON.parse(data);
        file.push(newRecord);

        fs.writeFile(process.env.FILES_FOLDER + 'registrations.json', JSON.stringify(file), err => {
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
            
            // return response.json('processing', {response : response, msg: 'Votre chèque a été ajouté avec succès. Un email de confirmation a été envoyé à la boite mail des protagonistes ainsi qu\'à celle de l\'accorderie.'});
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
              apiKey: '3868dda2ada63a06e420e1b0b6aad40c',
              apiSecret: '285a90d758a36377d1ce69b057772c2c'
            }
          }));
          const mail = {
            from: 'coeurdesbauges@accorderie.fr',
            to: beneficiary,

            subject: 'Nouvel enregistrement d\'un chèque temps : à ' + beneficiary + ' par ' + provider +' le '+ date ,

            html: '<p>Bonjour,</p><p>Un nouveau chèque temps de <b>'+ beneficiary +'</b> rendu par <b>'+ provider +'</b> ,</p><p> pour le service: <p><b>"'+ description +'"</b></p>, le <b>'+ date +'</b>, dont la durée est de <b>'+ hours +'h. '+ minutes +'min.</b></p>'
          };
          
          try {
            const info = transport.sendMail(mail);
            console.log(info);
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
              apiKey: '3868dda2ada63a06e420e1b0b6aad40c',
              apiSecret: '285a90d758a36377d1ce69b057772c2c'
            }
          }));
          const mail = {
            from: 'coeurdesbauges@accorderie.fr',
            to: provider,
            
            subject: 'Nouvel enregistrement d\'un chèque temps : à ' + beneficiary + ' par ' + provider +' le '+ date ,

            html: '<p>Bonjour,</p><p>Un nouveau chèque temps de <b>'+ beneficiary +'</b> rendu par <b>'+ provider +'</b> ,</p><p> pour le service: <p><b>"'+ description +'"</b></p>, le <b>'+ date +'</b>, dont la durée est de <b>'+ hours +'h. '+ minutes +'min.</b></p>'
          };
          
          try {
            const info = transport.sendMail(mail);
            console.log(info);
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
              apiKey: '3868dda2ada63a06e420e1b0b6aad40c',
              apiSecret: '285a90d758a36377d1ce69b057772c2c'
            }
          }));
          const mail = {
            from: 'coeurdesbauges@accorderie.fr',
            to: 'coeurdesbauges@accorderie.fr',
            subject: 'Nouvel enregistrement d\'un chèque temps : à ' + beneficiary + ' par ' + provider +' le '+ date ,

            html: '<p>Bonjour,</p><p>Un nouveau chèque temps de <b>'+ beneficiary +'</b> rendu par <b>'+ provider +'</b> ,</p><p> pour le service: <p><b>"'+ description +'"</b></p>, le <b>'+ date +'</b>, dont la durée est de <b>'+ hours +'h. '+ minutes +'min.</b></p>'
          };
          
          try {
            const info = transport.sendMail(mail);
            console.log(info);
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
              apiKey: '3868dda2ada63a06e420e1b0b6aad40c',
              apiSecret: '285a90d758a36377d1ce69b057772c2c'
            }
          }));
          const mail = {
            from: 'leander.fuchs@webexpertbusiness.net',
            to: 'leanderfuchs@gmail.com',
            
            subject: 'Nouvel enregistrement d\'un chèque temps : à ' + beneficiary + ' par ' + provider +' le '+ date ,

            html: '<p>Bonjour,</p><p>Un nouveau chèque temps de <b>'+ beneficiary +'</b> rendu par <b>'+ provider +'</b> ,</p><p> pour le service: <p><b>"'+ description +'"</b></p>, le <b>'+ date +'</b>, dont la durée est de <b>'+ hours +'h. '+ minutes +'min.</b></p>'
          };
          
          try {
            const info = transport.sendMail(mail);
            console.log(info);
          } catch (err) {
            console.error(err);
          }
    };

};
