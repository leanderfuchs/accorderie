const dotenv = require('dotenv');
const { Client } = require('pg');

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
    console.log('index controller DB connected')
  }
})

exports.indexController = function (req, res, next) {

  // fetch all categories
  const categoriesQuery = 'SELECT id, title FROM category WHERE is_deleted = false';

  client.query(categoriesQuery, (err, data, response) => {
    console.log('fetching data');

    if (err) {
      
      console.log('error fetching data');

      throw err;
    
    } else {
    
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

          response["service_beneficiary_email"] = '';
          response["service_beneficiary_name"] = '';
          response["service_provider_email"] = '';
          response["service_provider_name"] = '';
          response["service_description"] = '';
          response["hours"] = '';
          response["minutes"] = '';
          response["reference"] = '';
          response["category"] = '';
          response["sub-category"] = '';

          res.render('index', { response, categories, subCategories});

        }
      });
    }
  });
};
