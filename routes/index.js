var express = require('express');
var router = express.Router();
const userModel = require('./users');
const postModel = require('./post');
const passport = require('passport');
const localStrategy = require('passport-local');
const upload = require('./multer')

passport.use(new localStrategy(userModel.authenticate()));

router.get('/', function (req, res, next) {
  res.render('index', {nav: false});
});

router.get('/register', function (req, res, next) {
  res.render('register', {nav: false});
});

router.get('/profile', isLoggedIn, async function (req, res, next) {
  const user =
  await userModel
        .findOne({username: req.session.passport.user})
        .populate("posts")
  res.render('profile', {user, nav: true});
});

router.get('/show/posts', isLoggedIn, async function (req, res, next) {
  const user =
  await userModel
        .findOne({username: req.session.passport.user})
        .populate("posts")
  res.render('show', {user, nav: true});
});

router.get('/feed', isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({username: req.session.passport.user})
  const posts = await postModel
        .find()
        .populate("user")
  res.render('feed', {user, posts, nav: true});
});

router.get('/add', isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({username: req.session.passport.user});
  res.render('add', {user, nav: true});
});

router.post('/createpost', isLoggedIn, upload.single("postimage"), async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });

  if (!req.file) {
    return res.status(400).send('Please select an image. <a href="/add">Go Back</a>');
  }

  if (!req.body.title || !req.body.description) {
    return res.status(400).send('Title and description are required. <a href="/add">Go Back</a>');
  }

  const post = await postModel.create({
    user: user._id,
    title: req.body.title,
    description: req.body.description,
    image: req.file.filename
  });

  user.posts.push(post._id);
  await user.save();
  res.redirect("/profile");
});

router.post('/fileupload', isLoggedIn, upload.single("image"), async function (req, res, next) {
  const user = await userModel.findOne({username: req.session.passport.user});
  user.profileImage = req.file.filename;
  await user.save();
  res.redirect("/profile");
});

router.get('/edit', isLoggedIn, async function(req, res, next) {
  try {
      const user = await userModel
      .findOne({username: req.session.passport.user})
      .populate("posts")
      res.render('edit', { user, nav: true });
  } catch (error) {
      next(error);
  }
});

router.post('/update', isLoggedIn, async function (req, res, next) {
  const userId = req.session.passport.user;
  try {
      const updatedUser = await userModel.findByIdAndUpdate(userId, {
          name: req.body.name,
          username: req.body.username,
          email: req.body.email,
          contact: req.body.contact
      }, { new: true });
      res.redirect("/profile");
  } catch (error) {
      console.error(error);
      res.status(500).send("Error updating profile");
  }  
  await user.save();
});

router.get('/delete/:postId', isLoggedIn, async function (req, res, next) {
  const postId = req.params.postId;
  try {
    await userModel.findOneAndUpdate(
      { _id: req.session.passport.user._id },
      { $pull: { posts: postId } }
    );
    await postModel.findByIdAndDelete(postId);
    res.redirect("/edit");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error deleting post. <a href='/edit'>Go Back</a>");
  }
});

router.post('/register', function (req, res, next) {
  const data = new userModel({
    username: req.body.username,
    email: req.body.email,
    contact: req.body.contact,
    name: req.body.fullname
  })

  userModel.register(data, req.body.password)
  .then(function(){
    passport.authenticate("local")(req,res,function(){
      res.redirect("/profile");
    })
  })
});

router.post('/login', passport.authenticate("local", {
  failureRedirect: "/",
  successRedirect: "/profile",
}), function (req, res, next) {
});

router.get('/logout', function(req, res, next){
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

function isLoggedIn(req, res, next){
  if(req.isAuthenticated()){
    return next();
  }
  res.redirect('/');
}

module.exports = router;