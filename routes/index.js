var express = require('express');
var router = express.Router();
const { body } = require('express-validator');

const { addRecordController } = require('../controllers/recordController.js');
const { indexController } = require('../controllers/indexController.js');

/* GET home page. */
router.get('/', indexController);

/* POST home page. */
router.post('/', 
    
    body('service_beneficiary_name')
      .isLength({ min: 2 })
      .withMessage('Le nom du bénéficiaire doit au moins contenir 2 lettres.'),

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

    body('service_provider_name')
      .isLength({ min: 2 })
      .withMessage('Le nom de la personne ayant rendu le service doit au moins contenir 2 lettres.')
      .custom((value,{req}) => {
        if(value == req.body.service_beneficiary_name){
            throw new Error("Les deux noms ne peuvent être les mêmes !");
        } else {
            return value;
        };
      }),

    body('service_description')
      .notEmpty()
      .isLength({ min: 15 })
      .withMessage('La description doit contenir au moins 15 caractères.'),

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

    addRecordController
);

const { 
  recordListController, 
  deleteRecordController,
  downloadRecordsController
} = require('../controllers/recordListController.js');

/* LIST. */
router.get('/accorderie-records-list-for-admins', recordListController);
router.post('/accorderie-records-list-for-admins/delete/:recordID', deleteRecordController);
router.get('/accorderie-records-list-for-admins/download-csv/', downloadRecordsController);

module.exports = router;
