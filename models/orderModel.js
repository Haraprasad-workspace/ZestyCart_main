const mongoose = require('../configuration/mongoose_connection')

const orderSchema = mongoose.Schema({
    userid:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user"
    },
    items:[
        {
            itemid:{
                type:mongoose.Schema.Types.ObjectId,
                ref:"menuitem"
            },
            quantity:Number
        }
    ],
    totalprice:Number,
    date:{
        type:Date,
        default:Date.now()
    }

});

module.exports = mongoose.model("order",orderSchema);