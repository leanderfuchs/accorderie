const { Client } = require('pg');
const dotenv = require('dotenv');
const json2csv = require('json2csv').Parser;

dotenv.config();

const client = new Client({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
  ssl: { rejectUnauthorized: false }
});

if (process.env.PG_USE_SSL) {
  client.ssl = { rejectUnauthorized: false };
}

client.connect();

const recordListController = function (req, res, body) {
  const query = 'SELECT * FROM timecheck WHERE is_deleted = false ORDER BY id DESC';

  client.query(query, (err, data) => {

    if (err) {
      return res.render('list', { error: 'une erreur est survenue. Veuillez contacter l\'accorderie' });
    }
    else {
      const dataArray = Array.from(data.rows);
      return res.render('list', { dataArray: [dataArray], records: data.rows });
    }
  });
};

const deleteRecordController = ((req, res) => {
  const id = Number(req.body.recordID)

  const query = 'UPDATE timecheck SET updated_at = NOW(), is_deleted = true WHERE id=' + id;

  client.query(query, (err, data) => {
    if (err) {
      return res.render('list', { error: 'une erreur est survenue lors de la suppression. Veuillez contacter l\'accorderie' });
    }
    else {
      console.log('Deleted successfully.');
      return res.redirect('/accorderie-records-list-for-admins');
    }
  });
})

const downloadRecordsController = ((req, res) => {
  const query = 'SELECT * FROM timecheck ORDER BY id DESC';

  client.query(query, (err, data) => {

    if (err) {
      return res.render('index', { error: 'une erreur est survenue lors de l\'enregistrement. Veuillez contacter l\'accorderie' });
    }
    else {
      const dataArray = JSON.parse(JSON.stringify(data.rows));
      const header = ['id', 'Date', 'Beneficiary', 'Provider', 'Description', 'Duration','Ref', 'User agent', 'User ip', 'Updated at', 'Is deleted'];
      const json_data = new json2csv({header});
      const csv_data = json_data.parse(dataArray);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=time-exchange-records.csv");
      res.status(200).end(csv_data)
    }
  });
})

const setDuration = (record) => {
  if (record.minutes < 10) {
    record.minutes = '0' + record.minutes;
  }

  if (record.hours < 10) {
    record.hours = '0' + record.hours;
  }

  record.duration = record.hours + 'h' + record.minutes + 'm';
  delete record.hours;
  delete record.minutes;

  return record;
}

module.exports = {
  recordListController,
  deleteRecordController,
  downloadRecordsController
}