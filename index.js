// Declare variables / import classes
const express = require('express');
let app = express();
let path = require('path');
const port = process.env.PORT || 3000;

// Configure server
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/bootstrap', express.static(path.join(__dirname, 'node_modules', 'bootstrap', 'dist')));
app.use(express.urlencoded({extended : true}));

// Connect to database
const knex = require('knex')({
	client: 'pg',
	connection: {
		host: process.env.RDS_HOSTNAME || 'localhost',
		user: process.env.RDS_USERNAME || 'postgres',
		password: process.env.RDS_PASSWORD || 'admin',
		database: process.env.RDS_DB_NAME || 'realproject3database',
		port: process.env.RDS_PORT || 5432, 
        ssl: process.env.DB_SSL ? {rejectUnauthorized: false} : false
	}
});

// Route to display home/index page
app.get('/', (req, res) => {
    res.render('index');
});

// Configure the server to start listening
app.listen(port, () => console.log(`Website is listening on port ${port}`));
