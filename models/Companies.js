const mongoose = require('mongoose')

const CompanySchema = new mongoose.Schema({
    name:{
        type:String,
        maxlength:50,
        required:[true, 'Please provide name']
    },
    rut:{
        type:Number,
        maxlength:12,
        minlength:12,
        required:[true, 'Please provide RUT']
    },
    createdBy:{
        type:mongoose.Types.ObjectId,
        ref:'User',
        required:[true, 'Please provide user']
    },
    customer:{
        type:mongoose.Types.ObjectId,
        ref:'Customer',
        required:[true, 'Please provide customer']
    },
    invoices:[{
        type:mongoose.Types.ObjectId, ref:'Invoice'
    }],
    receipts:[{
        type:mongoose.Types.ObjectId, ref:'Receipt'
    }],
    debtUyu:{
        type:Number,
        default:0
    },
    debtUsd:{
        type:Number,
        default:0
    },
    description:{
        type:String,
        maxlength:50
    }

},{timestamps:true})

module.exports = mongoose.model('Company', CompanySchema)