// Declare variables / import classes
const express = require('express');
let app = express();
const session = require('express-session'); // Used to store user-specific data
let path = require('path');
const port = process.env.PORT || 3000;

// Configure server
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/bootstrap', express.static(path.join(__dirname, 'node_modules', 'bootstrap', 'dist')));
app.use(express.urlencoded({extended : true}));
app.use(express.static('public'));

// Configure session middleware
app.use(session({
    secret: 'secret_key', // Replace with a secure key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set secure to true in production when using HTTPS
}));

// Connect to database Note(when connecting to RDS database, make sure you use the names on your computer)
const knex = require('knex')({
	client: 'pg',
	connection: {
		host: process.env.RDS_HOSTNAME || 'localhost',
		user: process.env.RDS_USERNAME || 'postgres',
		password: process.env.RDS_PASSWORD || '',
		database: process.env.RDS_DB_NAME || '',
		port: process.env.RDS_PORT || 5432, 
        ssl: process.env.DB_SSL ? {rejectUnauthorized: false} : false
	}
});

// External website -----------------------------------------------------------------------------------------------------------------------------
// Route to display home/index/landing page
app.get('/', (req, res) => {
    res.render('index');
});

// Route to display how you can help page
app.get('/how-to-help', (req, res) => {
    res.render('how-to-help');
});

// Route to display about us page
app.get('/about-us', (req, res) => {
    res.render('about-us');
});

// Route to display Jen's story page
app.get('/jens-story', (req, res) => {
    res.render('jens-story');
});

// Route to display Thank You to Sponsors page
app.get('/sponsors', (req, res) => {
    res.render('sponsors');
});

// Route to display homelessness dashboard page
app.get('/homelessness-data', (req, res) => {
    res.render('homelessness-data');
});

// Route to display event request form page
app.get('/event', (req, res) => {
    res.render('event');
});

// Route to display volunteer form page
app.get('/volunteer', (req, res) => {
    res.render('volunteer');
});

// Route to display login page
app.get('/login', (req, res) => {
    res.render('login');
});

// Internal website ----------------------------------------------------------------------------------------------------------------------------
// Route to display internal landing page
app.get('/admin-welcome', (req, res) => {
    res.render('admin-welcome');
});

// Route to display volunteer management page
app.get('/volunteer-manage', (req, res) => {
    res.render('volunteer-manage');
});

// Route to display event management page
app.get('/event-manage', (req, res) => {
    res.render('event-manage');
});

// Route to display user management page
app.get('/user-manage', (req, res) => {
    res.render('user-manage');
});

// Route to display internal dashboard and past events page
app.get('/past-events', (req, res) => {
    res.render('past-events');
});

// Configure the server to start listening
app.listen(port, () => console.log(`Website is listening on port ${port}`));
