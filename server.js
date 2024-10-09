('use strict');
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const session = require('express-session');
const passport = require('passport');
const { ObjectID } = require('mongodb');
const LocalStrategy = require('passport-local');
const cors = require('cors');

const app = express();

app.set('view engine', 'pug');
app.set('views', './views/pug');

app.use(
	session({
		secret: process.env.SESSION_SECRET,
		resave: true,
		saveUninitialized: true,
		cookie: { secure: false },
	})
);

app.use(passport.initialize());
app.use(passport.session());

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

myDB(async client => {
	// Connect to MongoDB
	await client.connect();

	// Connect to database and collection
	const myDataBase = await client.db('database').collection('users');

	// GET / –– Render main page
	app.route('/').get((req, res) => {
		res.render('index', {
			title: 'Connected to Database',
			message: 'Please login',
			showLogin: true,
			showRegistration: true,
		});
	});

	// GET /login –– Authenticate user
	app
		.route('/login')
		.post(
			passport.authenticate('local', { failureRedirect: '/' }),
			(req, res) => {
				res.redirect('/profile');
			}
		);

	// GET /profile –– Show profile, if authenticated
	app.route('/profile').get(ensureAuthenticated, (req, res) => {
		res.render('profile', {
			username: req.user.username,
		});
	});

	// GET /logout -- Logout the user
	app.route('/logout').get((req, res) => {
		req.logout();
		res.redirect('/');
	});

	// POST /register -- Register new account
	app.route('/register').post(
		(req, res, next) => {
			myDataBase.findOne({ username: req.body.username }, (err, user) => {
				if (err) {
					next(err);
				} else if (user) {
					res.redirect('/');
				} else {
					myDataBase.insertOne(
						{
							username: req.body.username,
							password: req.body.password,
						},
						(err, doc) => {
							if (err) {
								res.redirect('/');
							} else {
								next(null, doc.ops[0]);
							}
						}
					);
				}
			});
		},
		passport.authenticate('local', { failureRedirect: '/' }),
		(req, res, next) => {
			res.redirect('/profile');
		}
	);

	// 404 Status –– Handle 404 errors
	app.use((req, res, next) => {
		res.status(404).type('text').send('Not Found');
	});

	// Initialize Passport
	passport.use(
		new LocalStrategy((username, password, done) => {
			myDataBase.findOne({ username: username }, (err, user) => {
				console.log(`User ${username} attempted to log in.`);
				if (err) return done(err);
				if (!user) return done(null, false);
				if (password != user.password) return done(null, false);
				return done(null, user);
			});
		})
	);

	passport.serializeUser((user, done) => {
    done(null, user._id);
  });
  
  passport.deserializeUser((id, done) => {
    myDataBase.findOne({ _id: new ObjectID(id) }, (err, doc) => {
      done(null, doc);
    });
  });

}).catch((e) => {
	app.route('/').get((req, res) => {
		res.render('index', { title: e, message: 'Unable to connect to database' });
	});
});

function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}
	res.redirect('/');
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Listening on port ${PORT}`);
});
