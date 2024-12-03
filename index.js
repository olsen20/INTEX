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
		password: process.env.RDS_PASSWORD || '0121',
		database: process.env.RDS_DB_NAME || 'intex',
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
// Login user
app.post('/login', async (req, res) => {
    const username = req.body.username.toUpperCase();
    const password = req.body.password;

    try {
        // Search for the username in the employees table
        const user = await knex('employees').where({ username }).first();

        if (!user) {
            // If the user doesn't exist, render the login page with an error message
            return res.status(400).render('login', { errorMessage: 'Username is not found.' });
        }

        // Compare the provided password with the stored password
        if (password === user.password) {
            // If the password matches, store username in the session
            req.session.username = user.username;

            // Redirect to the internal landing page
            return res.redirect('/admin-welcome');
        } else {
            // If the password is incorrect, render the login page with an error message
            return res.status(400).render('login', { errorMessage: 'Password is incorrect.' });
        }

    } catch (error) {
        console.error('Error handling login:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to display internal landing page
app.get('/admin-welcome', async (req, res) => {
    try {
        // Retrieve user's first name
        const name = await knex('employees')
            .select('user_first_name')
            .where('username', req.session.username)
            .first();
        const first_name = name.user_first_name; // Extract first name

        // Retrieve new volunteer forms
        const volunteer_records = await knex('volunteers')
            .where('volunteer_status', 'N')
            .count('* as count');  // Count the number of records returned
        const volunteer_count = volunteer_records[0].count;  // Extract the count of records returned from the query

            // Retrieve necessary event forms
            const event_records = await knex('event_details')
            .whereIn('event_status', ['N', 'C'])  // Return events that are new or currently being contacted
            .count('* as count');  // Count the number of records returned
        const event_count = event_records[0].count;  // Extract the count of records returned from the query

        // Render the view with all data
        res.render('admin-welcome', { first_name, volunteer_count, event_count });
    } catch (error) {
        console.error('Error fetching data for internal landing page:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to display volunteer management page
app.get('/volunteer-manage', async (req, res) => {
    try {
    const new_forms = await knex('volunteers')
        .select('volunteer_id', 'volunteer_first_name', 'volunteer_last_name', 'volunteer_email_address', 'volunteer_city', 'volunteer_state')
        .where('volunteer_status', 'N');  // Retrieve new forms

    const current = await knex('volunteers')
        .select('volunteer_id', 'volunteer_first_name', 'volunteer_last_name', 'volunteer_email_address', 'volunteer_city', 'volunteer_state')
        .where('volunteer_status', 'A')  // Retrieve active forms

    const past = await knex('volunteers')
        .select('volunteer_id', 'volunteer_first_name', 'volunteer_last_name', 'volunteer_email_address', 'volunteer_city', 'volunteer_state')
        .where('volunteer_status', 'X')  // Retrieve past volunteer forms

    // Render the page with the volunteer form data
    res.render('volunteer-manage', { new_forms, current, past });
    } catch (error) {
        console.error('Error fetching data for internal landing page:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/admin-add-volunteer', (req, res) => {
    res.render('admin-add-volunteer');
})

// Route to display volunteer details page
app.get('/volunteer-details/:id', (req, res) => {
    let id = req.params.id;

    // Retrieve volunteer information with selected ID
    knex('volunteers')
        .where('volunteer_id', id)
        .first()
        .then(volunteer => {
            if (!volunteer) {
                return res.status(404).send('Volunteer not found');
            }
            res.render('volunteer-details', { volunteer });
    })
    .catch(error => {
        console.error('Error fetching volunteer:', error);
        res.status(500).send('Internal Server Error');
    });
});

// Update the volunteer route
app.post('/update-volunteer/:id', (req, res) => {
    const id = req.params.id;
    const volunteer_first_name = req.body.first_name;
    const volunteer_last_name = req.body.last_name;
    const volunteer_phone_number = req.body.phone;
    const volunteer_email_address = req.body.email;
    const volunteer_street = req.body.street_address;
    const volunteer_city = req.body.city;
    const volunteer_state = req.body.state.toUpperCase();
    const volunteer_zip = req.body.zip;
    const volunteer_referral_source = req.body.referral_source;
    const volunteer_sewing_level = req.body.sewing_level;
    const volunteer_monthly_hours = parseInt(req.body.volunteer_hours);
    const volunteer_newsletter_optin = req.body.newsletter === 'true';

    // Update the volunteer in the database
    knex('volunteers')
        .where('volunteer_id', id)
        .update({
            volunteer_first_name: volunteer_first_name,
            volunteer_last_name: volunteer_last_name,
            volunteer_phone_number: volunteer_phone_number,
            volunteer_email_address: volunteer_email_address,
            volunteer_street: volunteer_street,
            volunteer_city: volunteer_city,
            volunteer_state: volunteer_state,
            volunteer_zip: volunteer_zip,
            volunteer_referral_source: volunteer_referral_source,
            volunteer_sewing_level: volunteer_sewing_level,
            volunteer_monthly_hours: volunteer_monthly_hours,
            volunteer_newsletter_optin: volunteer_newsletter_optin,
        })
        // Redirect to volunteer management page after saving to the database
        .then(() => {
            res.redirect('/volunteer-manage')
        })
        .catch(error => {
            console.error('Error updating volunteer:', error);
            res.status(500).send('Internal Server Error');
    });
});

// Delete volunteer
app.post('/delete-volunteer/:id', (req, res) => {
    const id = req.params.id;
    knex('volunteers')
        .where('volunteer_id', id)
        .del()
        .then(() => {
            res.redirect('/volunteer-manage'); // Redirect to the volunteer management page after deletion
        })
        .catch(error => {
            console.error('Error deleting volunteer:', error);
            res.status(500).send('Internal Server Error');
    });
});

// Route to display event management page
app.get('/event-manage', (req, res) => {
    res.render('event-manage');
});

app.get('/admin-add-event', (req, res) => {
    res.render('admin-add-event');
})

// Route to display event details page
app.get('/event-details', (req, res) => {
    res.render('event-details');
});

// Route to display an occurred event page
app.get('/event-occurred', (req, res) => {
    res.render('event-occurred');
});

// Route to display user management page
app.get('/user-manage', (req, res) => {
    res.render('user-manage');
});

// Route to display profile page
app.get('/profile', (req, res) => {
    res.render('profile');
});

// Route to add user page
app.get('/add-user', (req, res) => {
    res.render('add-user');
});

// Route to user details page
app.get('/user-details', (req, res) => {
    res.render('user-details');
});

// --------------------------------------------------------------------------------------------------------------------------------------------
// Configure the server to start listening
app.listen(port, () => console.log(`Website is listening on port ${port}`));
