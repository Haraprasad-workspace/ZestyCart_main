const mongoose = require('../configuration/mongoose_connection')

const cartSchema = mongoose.Schema({
    userid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    items: [
        {
            itemId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "menuitem"
            },
            quantity: {
                type: Number,
                default: 1
            }
        }
    ]
});


module.exports = mongoose.model("cart", cartSchema);