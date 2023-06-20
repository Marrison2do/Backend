const express = require('express')
const router = express.Router()

const{  getAllChecks,
        getCheck,
        createCheck,
        updateCheck,
        deleteCheck} = require('../controllers/checks')

router.route('/').post(createCheck).get(getAllChecks)

router.route('/:id').get(getCheck).patch(updateCheck).delete(deleteCheck)

module.exports = router