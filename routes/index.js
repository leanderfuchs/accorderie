var express = require('express');
var router = express.Router();
const { body } = require('express-validator');

const { addRecordController } = require('../controllers/recordController.js');

const response = [];
response["service_beneficiary_email"] = '';
response["service_provider_email"] = '';
response["service_description"] = '';
response["hours"] = '';
response["minutes"] = '';
response["reference"] = '';

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {response});
});

/* POST home page. */
router.post('/', 
    body('service_beneficiary_email')
      .notEmpty()
      .isEmail()
      .withMessage('L\'email du bénéficiaire est incorrect'),

    body('service_provider_email')
      .notEmpty()
      .isEmail()
      .withMessage('L\'email de la personne ayant rendu le service est incorrect.')
      .custom((value,{req}) => {
        if(value == req.body.service_beneficiary_email){
            throw new Error("Les deux emails ne peuvent être les mêmes !");
        } else {
            return value;
        };
      }),

    body('service_description')
      .notEmpty()
      .isLength({ min: 10 })
      .withMessage('La description doit contenir au moins 10 caractères.'),

    body('hours')
      .isFloat({ min: 0, max: 39 })
      .withMessage('L\'heure doit être un numéro entre 0 et 39.'),

    body('minutes')
      .notEmpty()
      .isFloat({ min: 0, max: 59 })
      .custom((value,{req}) => {
        if(value == 0 && req.body.hours == 0){
            throw new Error("Il faut une durée minimum pour le service");
        } else {
            return value;
        };
      }),

    body('reference')
      .isString()
      .withMessage('La référence doit être composée de lettres et de chiffres.'),

    addRecordController
);

const { 
  recordListController, 
  deleteRecordController,
  downloadRecordsController
} = require('../controllers/recordListController.js');

/* LIST. */
router.get('/list-accorderie-records-list-for-admins', recordListController);
router.post('/list-accorderie-records-list-for-admins/delete/:recordID', deleteRecordController);
router.get('/list-accorderie-records-list-for-admins/download-csv/', downloadRecordsController);

module.exports = router;
