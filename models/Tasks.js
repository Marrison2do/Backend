const { boolean } = require('joi')
const mongoose = require('mongoose')

const TaskSchema = new mongoose.Schema({
    
    description:{
        type:String,
        required:[true, 'please provide description'],
        maxlength:100
    },
    price:{
        type:Number
    },
    customer:{
        type:mongoose.Types.ObjectId,
        ref:'Customer',
        required:[true, 'Please provide customer']
    },
    createdBy:{
        type:mongoose.Types.ObjectId,
        ref:'User',
        required:[true, 'Please provide user']
    },
    updatedBy:{
        type:mongoose.Types.ObjectId,
        ref:'User'
    },
    check:{type:mongoose.Types.ObjectId,
        ref:'Check'
    },
    currency:{
        type:String,
        enum:['UYU','USD'],
        required:[true, 'Please provide currency']
    },
    type:{
        type:String,
        enum:['debt','payment'],
        default:'debt'
    },
    adminRank:{
        type:Boolean,
        default:false
    },
    archive:{
        type:Boolean,
        default:false
    }
},{timestamps:true})

module.exports = mongoose.model('Task', TaskSchema)