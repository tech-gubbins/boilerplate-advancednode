const bcrypt = require('bcrypt');
const passport = require('passport');
const GitHubStrategy = require('passport-github').Strategy;



module.exports = function (app, myDataBase) {
	// GET / –– Render main page
	app.route('/').get((req, res) => {
		res.render('index', {
			title: 'Connected to Database',
			message: 'Please login',
			showLogin: true,
			showRegistration: true,
			showSocialAuth: true,
		});
	});

	// GET /login –– Authenticate user with vanilla account
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
					const hash = bcrypt.hashSync(req.body.password, 12);

					myDataBase.insertOne(
						{
							username: req.body.username,
							password: hash,
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

    // GET /auth/github –– Authenticate user with GitHub
	app.route('/auth/github').get(passport.authenticate('github'));

	// GET /auth/github/callback –– Callback from GitHub
	app
		.route('/auth/github/callback')
		.get(
			passport.authenticate('github', { failureRedirect: '/' }),
			(req, res) => {
				res.render('chat', {
                    user_id: req.user.id,
                });
			}
		);

    // GET /chat –– User chat area
    app
        .route('/chat')
        .get(ensureAuthenticated, (req, res) => {
            res.render('chat', {
                user: req.user
            });
        });

	// 404 Status –– Handle 404 errors
	app.use((req, res, next) => {
		res.status(404).type('text').send('Not Found');
	});

	// Handles whether a user is authenticated or not
	function ensureAuthenticated(req, res, next) {
		if (req.isAuthenticated()) {
			return next();
		}
		res.redirect('/');
	}
};
