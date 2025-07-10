const multer = require('multer')
const path = require('path')
const crypto = require('crypto')
const cloudinary = require('cloudinary').v2
const { CloudinaryStorage } = require('multer-storage-cloudinary')

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET

})
let storage;
if (process.env.NODE_ENV === "production") {
    storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'ZestyCart',
            allowed_formats: ['jpg', 'png', 'jpeg'],
            transformation: [{ width: 800, height: 800, crop: 'limit' }]
        }
    })
} else {
    //disk storage setup
    storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, './public/images/uploadedimage')
        },
        filename: function (req, file, cb) {

            crypto.randomBytes(12, (err, name) => {
                const fn = name.toString('hex') + path.extname(file.originalname);
                cb(null, fn)
            })
        }
    })
}


const upload = multer({storage})

module.exports = upload
//export upload variable 