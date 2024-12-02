// Declare variables / import classes
const express = require('express');
let app = express();
let path = require('path');
const port = 3000;

// Configure server
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/bootstrap', express.static(path.join(__dirname, 'node_modules', 'bootstrap', 'dist')));
app.use(express.urlencoded({extended : true}));

// Connect to database
// const knex = require('knex')({
// 	client: 'pg',
// 	connection: {
// 		host: '',
// 		user: 'postgres',
// 		password: '',
// 		database: '',
// 		port: 5432
// 	}
// });

// Route to display home/index page
app.get('/', (req, res) => {
    res.render('index');
});

// Configure the server to start listening
app.listen(port, () => console.log(`Website is listening on port ${port}`));
