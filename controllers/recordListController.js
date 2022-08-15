var fs = require('fs');
var format = require('date-format');
var path = require('path');

const FILES_DIR = path.resolve('./public/files');

exports.recordListController = function (req, res, body) 
{
    console.log('processing reading file ...');

    fs.readFile( FILES_DIR + '/registrations.json', 'utf8', (err, data) => {
        
      if (err) {
        console.error(err);
        return res.sendStatus(400).send({ error: 'Désolé, une erreur de lecture est survenue. Vous pouvez recommencer ou nous appeler au 0749702058 !' })
      }

      console.log('file read successfully ...');

      var file = JSON.parse(data);
      
      if (!file) {
        return res.status(404).send('Records not found')
      }

      // Fix minutes missing 0 in front of smaller numbers
      if( file.minutes < 10) {
        file.minutes = '0' + file.minutes;
      }


      file.sort(function(a, b) {
        return b.id - a.id;
      });

      res.render('list', {data: data, records: file })
    });
};
