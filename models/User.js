const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const UserSchema = new mongoose.Schema({
    name:{
        type:String,
        required:[true, 'Please provide name'],
        minlength:3,
        maxlength:50,
    },
    username:{
        type:String,
        required:[true, 'Please provide username'],
        unique:true
    },
    password:{
        type:String,
        required:[true, 'Please provide password'],
        minlength:6
    },
    rank:{
        type:String,
        enum:['user','admin'],
        required:[true, 'Please provide rank'],
    },
    user:{
        type:Number,
        required:[true, 'Please provide user'],
        unique:true
    },
    tasks:[{
        type:mongoose.Types.ObjectId, ref:'Task'
    }],
    customers:[{
        type:mongoose.Types.ObjectId, ref:'Customer'
    }],
    companies:[{
        type:mongoose.Types.ObjectId, ref:'Company'
    }],
    receipts:[{
        type:mongoose.Types.ObjectId, ref:'Receipt'
    }],
    checks:[{
        type:mongoose.Types.ObjectId, ref:'Check'
    }],
    invoices:[{
        type:mongoose.Types.ObjectId, ref:'Invoice'
    }]




})

UserSchema.pre('save', async function(){
    if(this.password.length>20) {}
    else 
    {const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password,salt)}
})

UserSchema.methods.createJWT = function () {
    return jwt.sign({userId:this._id,name:this.name,rank:this.rank},process.env.JWT_SECRET,{expiresIn:process.env.JWT_LIFETIME})
}

UserSchema.methods.comparePassword = async function (candidatePassword){
    const isMatch = await bcrypt.compare(candidatePassword, this.password)
    return isMatch
}

module.exports = mongoose.model('User',UserSchema)