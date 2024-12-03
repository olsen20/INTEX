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
    cookie: { secure: true } // Set secure to true in production when using HTTPS
}));

// Connect to database Note(when connecting to RDS database, make sure you use the names on your computer)
const knex = require('knex')({
	client: 'pg',
	connection: {
		host: process.env.RDS_HOSTNAME || 'localhost',
		user: process.env.RDS_USERNAME || 'postgres',
		password: process.env.RDS_PASSWORD || 'admin',
		database: process.env.RDS_DB_NAME || 'intext', 
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

app.post('/event', async (req, res) => {
    try {
        const {
            'number-of-people': numberOfPeople,
            'event-type': eventType,
            'event-date': eventDate,
            'backup-date': backupDate,
            'street-address': streetAddress,
            city,
            state,
            zip,
            group,
            'start-time': startTime,
            'event-length': eventLength,
            'contact-name': contactName,
            'phone-number': phoneNumber,
            email,
            'jen-share': jenShare,
            'advanced-sewing': advancedSewing,
            'basic-sewing': basicSewing,
            'sewing-machines': sewingMachines,
            sergers
        } = req.body;

        await knex('EVENT_DETAILS').insert({
            Event_Attendees: parseInt(numberOfPeople),
            Event_Type: eventType,
            Event_Date: eventDate,
            Event_Backup_Date: backupDate,
            Event_Street: streetAddress,
            Event_City: city,
            Event_State: state,
            Event_Zip: zip,
            Event_Association: group,
            Event_Start_Time: startTime,
            Event_Length: parseInt(eventLength),
            Contact_Name: contactName, // Assuming you have a column for contact name
            Contact_Phone_Number: phoneNumber, // Assuming you have a column for contact phone number
            Contact_Email_Address: email, // Assuming you have a column for contact email
            Share_Story: jenShare === 'yes' ? true : false, // Assuming Share_Story is a boolean
            Advanced_Sewing_Count: parseInt(advancedSewing),
            Basic_Sewing_Count: parseInt(basicSewing),
            Sew_Machine_Count: parseInt(sewingMachines),
            Sergers_Machine_Count: parseInt(sergers)
        });

        res.redirect('/thank-you'); // Redirect to a thank you page after successful submission
    } catch (error) {
        console.error('Error inserting event data:', error);
        res.status(500).send('Error saving event information.');
    }
});

// Route to display volunteer form page
app.get('/volunteer', (req, res) => {
    res.render('volunteer');
});

// Route to submit data from the volunteer form page to the database
app.post('/volunteer', async (req, res) => {
    try {
        const {
            'first-name': firstName,
            'last-name': lastName,
            email,
            phone,
            'street-address': streetAddress,
            city,
            state,
            zip,
            'how-heard': howHeard,
            'how-heard-other-text': howHeardOtherText,
            'sewing-level': sewingLevel,
            'volunteer-hours': volunteerHours,
            newsletter
        } = req.body;

        // Determine how they heard about the opportunity
        const referralSource = howHeard === 'other' ? howHeardOtherText : howHeard;

        await knex('VOLUNTEERS').insert({
            Volunteer_First_Name: firstName,
            Volunteer_Last_Name: lastName,
            Volunteer_Email_Address: email,
            Volunteer_Phone_Number: phone,
            Volunteer_Street: streetAddress,
            Volunteer_City: city,
            Volunteer_State: state,
            Volunteer_Zip: zip,
            Volunteer_Referral_Source: referralSource || 'Other',
            Volunteer_Sewing_Level: sewingLevel,
            Volunteer_Monthly_Hours: parseInt(volunteerHours),
            Volunteer_Newsletter_OptIn: newsletter ? 'Yes' : 'No',
            Volunteer_Status: 'A' // Assuming 'A' is for active volunteers
        });

        res.redirect('/thank-you'); // Redirect to a thank you page after successful submission
    } catch (error) {
        console.error('Error inserting volunteer data:', error);
        res.status(500).send('Error saving volunteer information.');
    }
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

// Configure the server to start listening
app.listen(port, () => console.log(`Website is listening on port ${port}`));
