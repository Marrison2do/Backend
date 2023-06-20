const express = require('express')
const router = express.Router()

const{  getAllCustomers,
        getCustomer,
        createCustomer,
        updateCustomer,
        deleteCustomer} = require('../controllers/customers')

router.route('/').post(createCustomer).get(getAllCustomers)

router.route('/:id').get(getCustomer).patch(updateCustomer).delete(deleteCustomer)

module.exports = router