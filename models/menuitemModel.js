const mongoose = require('../configuration/mongoose_connection')

const menuitemSchema = mongoose.Schema({
    itemname:{
        type:String,
        required:true
    },
    price:{
        type:String,
        required:true
    },
    imageurl:String,
    description:String,
    stockstatus:{
        type:String,
        default:"out of stock"
    }

});

module.exports = mongoose.model("menuitem",menuitemSchema);