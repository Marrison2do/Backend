const express = require('express')
const router = express.Router()

const{  getAllReceipts,
        getReceipt,
        createReceipt,
        updateReceipt,
        deleteReceipt} = require('../controllers/receipts')

router.route('/').post(createReceipt).get(getAllReceipts)

router.route('/:id').get(getReceipt).patch(updateReceipt).delete(deleteReceipt)

module.exports = router