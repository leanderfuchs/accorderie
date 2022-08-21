const { Client } = require('pg');
const dotenv = require('dotenv');

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

client.connect();

exports.recordListController = function (req, res, body) 
{
  const query = 'SELECT * FROM timecheck ORDER BY id DESC';

  client.query(query, (err, data) => {

    if (err) 
    {
      return res.render('index', { error: 'une erreur est survenue lors de l\'enregistrement. Veuillez contacter l\'accorderie' });
    }
    else 
    {
      const file = [];

      data.rows.forEach(element => {
        file.push(Object.values(element));
      });
      console.log(file);

      return res.render('list', { file: file, records: data.rows });      
    }
  });
};
