const express = require('express')
const app = express()
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const path = require('path')
const userModel = require('./models/userModel.js')
const menuitemModel = require('./models/menuitemModel.js')
const cartModel = require('./models/cartModel.js')
const orderModel = require('./models/orderModel.js')
const upload = require('./configuration/multer_config.js')
const cloudinary = require('./utils/cloudinary-config.js')
const mongoose = require('mongoose')
const compression = require('compression')
require('dotenv').config();


const PORT = process.env.PORT || 3000;
const adminemails = ['haraprasadmahapatra223@gmail.com', 'secondaryadmin@ZestyCart.com', 'primaryadmin@ZestyCart.com']
const superadminemails = ['haraprasadmahapatra223@gmail.com'];


app.set("view engine", "ejs")
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))
app.use(cookieParser())
app.use(compression());


//creating a middleware login check func , if the user is not logged in , it redirects it to login.ejs 
function isloggedin(req, res, next) {
    const token = req.cookies.token;
    try {
        if (!token || token == "") {
            return res.status(400).redirect('/login')
        }

        const data = jwt.verify(token, process.env.MYSECRETKEY);

        // Attach user data to request object
        req.user = data;

        // Pass control to next middleware or route
        next();

    } catch (err) {

        res.status(401).redirect('/login');
    }

}

function isadmin(req, res, next) {
    try {
        if (adminemails.includes(req.user.email)) {
            return next();
        }else{
            return res.status(500).render('oops', { message: "Access Denied : admins are only allowed to access" })
        }
    } catch (err) {
        return res.status(500).render('oops', { message: "Access Denied : admins are only allowed to access" })
    }

}

function issuperadmin(req, res, next) {
    if (superadminemails.includes(req.user.email)) {
        return next();
    } else {
        return res.status(500).render('oops', { message: "Access Denied : super admins are only allowed to access" })
    }
}






//ALL THE GET ROUTES ARE HERE ------>


app.get('/', isloggedin, (req, res) => {
    res.render('home')
})

//creating a login route ,  renders the login.ejs  
app.get('/login', (req, res) => {
    res.render('login')
})
//creating a register route ,  renders the register.ejs 
app.get('/register', (req, res) => {
    res.render('register')
})

//creating the logout route 
app.get('/logout', isloggedin, (req, res) => {
    res.cookie("token", "");
    res.redirect('/login');
})

//route to get the menu page 
app.get('/menu', isloggedin, async (req, res) => {
    try {
        let menuitem = await menuitemModel.find();
        res.render('menu.ejs', { menuitem })
    } catch (err) {
        return res.status(500).render('oops', { message: "something went wrong" })
    }


})

//route for the admin to add any food item
app.get('/admin/additem', isloggedin, isadmin, (req, res) => {
    res.render('admin_item');
})

//route for the cart page
app.get('/cart', isloggedin, async (req, res) => {
    try {

        let cart = await cartModel.findOne({ userid: req.user.userid }).populate('items.itemId')
        if (!cart) {
            return res.status(300).redirect('/menu')
        }
        let total = 0;

        if (cart) {
            cart.items.forEach(item => {
                total += item.itemId.price * item.quantity;
            })
        }
        res.render('cart', { cart, total })

    } catch (err) {
        return res.status(300).redirect('/oops')
    }


})


//whenever user click on + icon this route is triggered  , 
//checks weather the user has cart if yes check the particular item is there or not , if item is there then just increase the quantity 
//if item is not there then add the item on the cart
//if cart is not there then create cart and add item 
app.get('/addtocart/:id', isloggedin, isadmin, async (req, res) => {
    try {
        let userid = req.user.userid;
        let itemid = req.params.id;

        let cart = await cartModel.findOne({ userid: userid });

        if (!cart) {
            cart = await cartModel.create({
                userid,
                items: [
                    {
                        itemId: itemid,
                        quantity: 1
                    }
                ]

            })
        } else {
            const existingitem = cart.items.find(i => i.itemId.toString() === itemid)
            if (existingitem) {
                existingitem.quantity++;
            } else {
                cart.items.push({ itemId: itemid, quantity: 1 });
            }

            await cart.save()
        }
        res.redirect('/menu');
    } catch (err) {
        return res.status(500).redirect('/oops')
    }


})


//this is the route when user clicks on - 
//first checks the cart exist or not 
// if cart exist check items exits on not 
// if item exist the quantity is reduced by -1 
// whenever the quantity reaches zero , the item is spliced from the cart db
app.get('/removefromcart/:id', isloggedin, async (req, res) => {
    try {
        let userid = req.user.userid;
        let itemid = req.params.id;

        let cart = await cartModel.findOne({ userid: userid });
        if (!cart) {
            return res.redirect('/menu')
        }
        const index = cart.items.findIndex(i => i.itemId.toString() === itemid);

        if (index !== -1) {
            let item = cart.items[index];

            item.quantity--;

            if (item.quantity <= 0) {
                cart.items.splice(index, 1);
            }

            await cart.save()
        }
        res.redirect('/cart');
    } catch (err) {
        return res.status(500).redirect('/oops');
    }



})

//route for clear cart ,
//this logic deletes the cart document for that particular user 
app.get('/clearcart', isloggedin, async (req, res) => {
    try {
        let userid = req.user.userid;
        await cartModel.deleteOne({ userid })
        res.redirect('/cart');
    } catch (err) {
        return res.status(300).redirect('/menu')
    }


})

app.get('/admin/menu', isloggedin, isadmin, async (req, res) => {
    try {
        let menuitem = await menuitemModel.find();
        res.render('admin_menu.ejs', { menuitem })
    } catch (err) {
        return res.status(500).redirect('/oops');
    }

})

app.get('/admin/stockstatuschange/:id', isloggedin, isadmin, async (req, res) => {
    let item = await menuitemModel.findOne({ _id: req.params.id });
    if (!item) {
        return res.status(500).render('oops', { message: "something went wrong,sorry for your inconvinience try refreshing page or try again" })
    }
    try {

        if (item.stockstatus == "out of stock") {
            let updateitem = await menuitemModel.updateOne({ _id: req.params.id }, { stockstatus: "In stock" })
            return res.redirect('/admin/menu');
        }
        else {

            let updateitem = await menuitemModel.updateOne({ _id: req.params.id }, { stockstatus: "out of stock" })
            return res.redirect('/admin/menu');
        }

    } catch (err) {
        return res.status(500).redirect('/oops');
    }



})

app.get('/admin/edit_info/:id', isloggedin, isadmin, async (req, res) => {
    try {
        let item = await menuitemModel.findOne({ _id: req.params.id });
        res.render('admin_editinfo', { item })
    } catch (err) {
        return res.status(500).redirect('/oops');
    }



})

app.get('/admin/removeitem/:id', isloggedin, isadmin, async (req, res) => {
    try {
        let item = await menuitemModel.deleteOne({ _id: req.params.id });
        res.redirect('/admin/menu')
    } catch (err) {
        return res.status(500).redirect('/oops');
    }


})

app.get('/admin_home', isloggedin, isadmin, async (req, res) => {
    try {
        userid = req.user.userid;
        const totalrevenue = await orderModel.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: "$totalprice" }
                }
            }
        ])
        let revenue = totalrevenue[0] ? totalrevenue[0].total : 0;

        let totalusers = await userModel.countDocuments();

        let totalfooditems = await menuitemModel.countDocuments();

        let totalorders = await orderModel.countDocuments();

        let revenueperfood = revenue / totalfooditems;
        let revenueperorder = revenue / totalorders;
        let orderperperson = totalorders / totalusers;

        res.render('admin_home', { revenue, totalusers, totalfooditems, totalorders, revenueperfood, revenueperorder, orderperperson })

    } catch (err) {
        return res.status(500).redirect('/oops');
    }


})

app.get('/ordernow', isloggedin, async (req, res) => {
    let userid = req.user.userid;
    console.log(userid)
    let cart = await cartModel.findOne({ userid }).populate('items.itemId');
    if (!cart) {
        return res.status(500).render('oops', { message: "cart is empty , try refreshing page or try again" })
    }
    try {
        let total = 0;
        cart.items.forEach(i => {
            total += i.quantity * i.itemId.price;
        })

        await orderModel.create({
            userid,
            items: cart.items.map(i => ({
                itemid: i.itemId._id,
                quantity: i.quantity
            })),
            totalprice: total

        })

        await cartModel.deleteOne({ userid });

        res.redirect('ordersucess');

    } catch (err) {
        return res.status(500).redirect('/oops');
    }
})

app.get('/ordersucess', isloggedin, async (req, res) => {
    try {
        let userid = req.user.userid;
        let username = await userModel.findOne({ _id: userid })
        let lastorder = await orderModel.findOne({ userid }).sort({ date: -1 }).populate('items.itemid');
        res.render('ordersuccess', { order: lastorder, user: req.user, username });
    } catch (err) {
        return res.status(500).redirect('/oops');
    }


})

app.get('/admin/orderlogs', isloggedin, isadmin, async (req, res) => {
    let order;
    try {
        userid = req.user.userid;
        order = await orderModel.find().populate("userid").populate("items.itemid").sort({ date: -1 })
        res.render("admin_orderlogs", { order });
    } catch (err) {
        return res.status(500).redirect('/oops');
    }



})
app.get('/oops', (req, res) => {
    res.render('oops', { message: "Something Went wrong , try refreshing the page or restart the website" })
})




//ALL THE POST ROUTES START HERE ----->


//post login route having the login logic
app.post('/login', async (req, res) => {

    //destructure the request body to get the email and password 
    let { email, password } = req.body;
    //check the email user exist or not 
    let user = await userModel.findOne({
        email
    });
    //block to be executed if the user do not exist 
    if (!user) {
        return res.status(500).render('oops', { message: "email not found" })
    }
    //if user exist then , compare the password 
    bcrypt.compare(password, user.password, (err, result) => {
        if (result) {
            //if the password is same , the assing the jwt tokn having email and userid 
            const token = jwt.sign({ email: email, userid: user._id }, process.env.MYSECRETKEY, { expiresIn: "1h" })
            res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax"
            });

            res.redirect('/')
        }
        else {
            return res.status(500).render('oops', { message: "something went wrong,sorry for your inconvinience" })
        }
    })
})

//post register route with the register logic

app.post('/register', async (req, res) => {
    let { name, email, password } = req.body;

    let checkuser = await userModel.findOne({ email })
    if (checkuser) {
        return res.status(500).render('oops', { message: "email id already exist" })
    }

    bcrypt.genSalt(10, (err, salt) => {

        if (err) {
            return res.status(500).render('oops', { message: "internal server error" })
        }
        bcrypt.hash(password, salt, async (err, hash) => {
            if (err) {
                return res.status(500).render('oops', { message: "internal server error" })
            }
            let user = await userModel.create({
                name,
                email,
                password: hash

            })

            const token = jwt.sign({ email: email, userid: user._id }, process.env.MYSECRETKEY)
            res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax"
            });

            res.redirect('/')
        })
    })



})

//post route for add info to menuitemmodeljs 
app.post('/admin/additem', isloggedin, isadmin, upload.single("imageurl"), (req, res) => {
    let { itemname, price, description, stock } = req.body;

    cloudinary.uploader.upload(req.file.path, async function (err, result){
        if(err) {
            console.log(err);
            return res.status(500).render('oops', { message: "Image upload failed" });
        }

        try {
            let newitem = await menuitemModel.create({
                itemname,
                price,
                imageurl: result.secure_url, // save Cloudinary URL
                description,
                stock
            });
            res.redirect('/admin/menu');
        } catch (err) {
            console.log("DB Error:", err);
            return res.status(500).render('oops', { message: "Something went wrong, sorry for your inconvenience" });
        }
    })
});


app.post('/admin/edit_info/:id', isloggedin, isadmin, async (req, res) => {
    try {
        let { itemname, price, description } = req.body;
        let item = await menuitemModel.updateOne({ _id: req.params.id }, {
            itemname,
            price,
            description
        })
        res.redirect('/admin/menu');
    } catch (err) {
        return res.status(500).render('oops', { message: "something went wrong,sorry for your inconvinience" })
    }




})


app.listen(PORT);