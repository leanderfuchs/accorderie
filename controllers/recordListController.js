const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const client = new Client({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

if (process.env.NODE_ENV !== 'development')
{
    client.ssl = {rejectUnauthorized: false};
}

client.connect();

const recordListController = function (req, res, body) 
{
  const query = 'SELECT * FROM timecheck ORDER BY id DESC';

  client.query(query, (err, data) => {

    if (err) 
    {
      return res.render('index', { error: 'une erreur est survenue lors de l\'enregistrement. Veuillez contacter l\'accorderie' });
    }
    else 
    {
      const dataArray = Array.from(data.rows);
      return res.render('list', { dataArray: [dataArray] ,records: data.rows });      
    }
  });
};

const deleteRecordController = ((req, res) =>
{ 
  const id = Number(req.body.recordID)
  const query = 'DELETE FROM timecheck WHERE id=' + id ;
  
  client.query(query, (err, data) => {
    if (err) 
    {
      return res.render('list', { error: 'une erreur est survenue lors de la suppression. Veuillez contacter l\'accorderie' });
    }
    else 
    {
      const query = 'DELETE FROM timecheck WHERE id=' + id;
      console.log('Deleted successfully.');
      return res.redirect('/list-accorderie--records-list-for-admins');      
    }
  });
})

module.exports = {
  recordListController,
  deleteRecordController
}