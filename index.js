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
    cookie: { 
        maxAge: 1000 * 60 * 60,
        secure: false } // Set secure to true in production when using HTTPS
}));

// Connect to database Note(when connecting to RDS database, make sure you use the names on your computer)
const knex = require('knex')({
	client: 'pg',
	connection: {
		host: process.env.RDS_HOSTNAME || 'localhost',
		user: process.env.RDS_USERNAME || 'postgres',
		password: process.env.RDS_PASSWORD || 'project403',
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

// Route to display login page
app.get('/login', (req, res) => {
    res.render('login');
});

// Internal website ----------------------------------------------------------------------------------------------------------------------------
// Login user
app.post('/login', async (req, res) => {
    const username = req.body.username;
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
        console.error('Error fetching volunteer data', error);
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
    const volunteer_status = req.body.form_status;
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
            volunteer_status: volunteer_status,
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
app.post('/delete-volunteer/:id', async (req, res) => {
    const id = req.params.id;

    try {
        // Delete related records in the event_volunteers table (must do this before deleting related volunteers)
        await knex('event_volunteers').where('volunteer_id', id).del();

        // Delete the volunteer record
        await knex('volunteers').where('volunteer_id', id).del();

        // Redirect to the volunteer management page after deletion
        res.redirect('/volunteer-manage'); 
    } catch (error) {
        console.error('Error deleting volunteer:', error);
        res.status(500).send('Unable to delete volunteer due to associated records.');
    }
});

// Route to display event management page
app.get('/event-manage', async (req, res) => {
    try {
        const newForms = await knex('event_details')
            .join('event_contact_info', 'event_details.event_contact_id', '=', 'event_contact_info.event_contact_id')
            .select('event_id', 'event_contact_first_name', 'event_contact_last_name', 'event_association', 'event_date')
            .where('event_status', 'N');  // Retrieve new forms

        // Format the date
        const formattedDate = newForms.map(event => {
            return {
                ...event,
                event_date: new Date(event.event_date).toLocaleDateString('en-US'), // Format as MM/DD/YYYY
            };
        });
        
        // Render the event management page with the event data
        res.render('event-manage', { new_forms: formattedDate });
    } catch (error) {
        console.error('Error fetching event data:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/admin-add-event', (req, res) => {
    res.render('admin-add-event');
})

// Route to display event details page
app.get('/event-details/:id', async (req, res) => {
    let id = req.params.id;

    try {
        // Retrieve event information with selected ID
        let event = await knex('event_details')
            .join('event_contact_info', 'event_details.event_contact_id', '=', 'event_contact_info.event_contact_id')
            .where('event_id', id)
            .first();

        // Convert dates to 'YYYY-MM-DD' format
        event.event_date = new Date(event.event_date).toISOString().split('T')[0];
        event.event_backup_date = new Date(event.event_backup_date).toISOString().split('T')[0];

        // Retrieve active volunteers
        let volunteers = await knex('volunteers')
            .select('volunteer_id', 'volunteer_first_name', 'volunteer_last_name')
            .where('volunteer_status', 'A') // Where volunteer status is active
            .orderBy('volunteer_first_name', 'asc');

        // Retrieve IDs of volunteers associated with the event
        let associatedVolunteerIds = await knex('event_volunteers')
            .where('event_id', id)
            .pluck('volunteer_id'); // Returns an array of volunteer IDs

        // Render the event form with retrieved data
        res.render('event-details', { event, volunteers, associatedVolunteerIds });
        } catch (error) {
        console.error('Error fetching event', error);
        res.status(500).send('Internal Server Error');

    };
});
// Update an event form
app.post('/update-event/:id/:contact_id', async (req, res) => {
    const event_id = req.params.id;
    const event_contact_id = req.params.contact_id;

    try {
        const {
            event_date,
            start_time: event_start_time,
            backup_date: event_backup_date,
            group: event_association,
            event_type,
            street_address: event_street,
            state: event_state,
            city: event_city,
            zip: event_zip,
            event_length,
            jen_share: share_story,
            number_of_people: attendees,
            basic_sewing: basic_sewing_count,
            advanced_sewing: advanced_sewing_count,
            sewing_machines: sew_machine_count,
            sergers: sergers_machine_count,
            form_status: event_status,
            room: room_type,
            first_name: event_contact_first_name,
            last_name: event_contact_last_name,
            phone_number: event_contact_phone_number,
            email: event_contact_email_address,
            volunteers,
        } = req.body;

        const event_attendees = parseInt(attendees, 10) || 0;
        const volunteer_ids = Array.isArray(volunteers) ? volunteers.map(Number) : [];

        // Step 1: Update contact information
        await knex('event_contact_info')
            .where('event_contact_id', event_contact_id)
            .update({
                event_contact_first_name,
                event_contact_last_name,
                event_contact_phone_number,
                event_contact_email_address,
            });

        // Step 2: Update event details
        await knex('event_details')
            .where('event_id', event_id)
            .update({
                event_date,
                event_start_time,
                event_backup_date,
                event_association,
                event_type,
                event_street,
                event_state: event_state.toUpperCase(),
                event_city,
                event_zip,
                event_length,
                share_story: share_story === 'true',
                event_attendees,
                basic_sewing_count: parseInt(basic_sewing_count, 10) || 0,
                advanced_sewing_count: parseInt(advanced_sewing_count, 10) || 0,
                sew_machine_count: parseInt(sew_machine_count, 10) || 0,
                sergers_machine_count: parseInt(sergers_machine_count, 10) || 0,
                event_status,
                room_type,
            });

        // Step 3: Remove all existing volunteer associations for this event
        await knex('event_volunteers')
            .where('event_id', event_id)
            .del();

        // Step 4: Re-insert only the submitted volunteer associations
        if (volunteer_ids.length > 0) {
            const volunteerRows = volunteer_ids.map(volunteer_id => ({
                event_id,
                volunteer_id,
            }));
            await knex('event_volunteers').insert(volunteerRows);
        }

        // Redirect to events management page
        res.redirect('/event-manage');
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).send({ error: 'Failed to update event.' });
    }
});

// Delete an event
app.post('/delete-event/:id/:contact_id', async (req, res) => {
    const id = req.params.id;
    const contact_id = req.params.contact_id;

    try {
        // Delete related records in the event_volunteers table (must do this before deleting related events)
        await knex('event_volunteers').where('event_id', id).del();

        // Delete the event record
        await knex('event_details').where('event_id', id).del();

        // Delete related records in the event_contact_info table
        await knex('event_contact_info').where('event_contact_id', contact_id).del();

        // Redirect to the volunteer management page after deletion
        res.redirect('/event-manage'); 
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).send('Unable to delete event due to associated records.');
    }
});

// Route to display an occurred event page
app.get('/event-occurred', (req, res) => {
    res.render('event-occurred');
});

// Route to display user management page
app.get('/user-manage', (req, res) => {
    Promise.all([
        knex('employees').select('username', 'user_first_name', 'user_last_name').whereNot('username', req.session.username),
        knex('employees')
            .select('username', 'user_first_name', 'user_last_name')
            .where('username', req.session.username)
            .first()
    ])
    .then(([users, curr_user]) => {
        res.render('user-manage', { users, curr_user });
    })
    .catch(error => {
        console.error('Error fetching users:', error);
        res.status(500).send('Internal Server Error');
    });
});


// Route to display profile page
app.get('/profile', (req, res) => {
    
    knex('employees')
    .where('username', req.session.username)
    .first()
    .then(user => {
        res.render('profile', { user });
    })
    .catch(error => {
        console.error('Error fetching profile:', error);
        res.status(500).send('Internal Server Error');
    });
      
});

app.post('/profile/:user', (req,res) => {
    const user = req.params.user

    const username = req.body.username
    const password = req.body.password;
    const first_name = req.body.first_name;
    const last_name = req.body.last_name;
    const email = req.body.email;
    const phone = req.body.phone;
    const street_address = req.body.street_address;
    const city = req.body.city;
    const state = req.body.state;
    const zip = req.body.zip;
    const gender = req.body.gender;
    const role = req.body.role;

    knex('employees')
    .where('username', user)
    .update({
        username : username,
        password : password,
        user_first_name : first_name,
        user_last_name : last_name,
        user_email_address : email,
        user_phone_number : phone,
        user_street : street_address,
        user_city : city,
        user_state : state,
        user_zip : zip,
        user_gender : gender,
        user_position : role
    })
    .then(() => {
        res.redirect('/user-manage')
    })
    .catch(error => {
        console.error('Error updating profile:', error);
        res.status(500).send('Internal Server Error');
    });
});

// Route to add user page
app.get('/add-user', (req, res) => {
    res.render('add-user');
});

// const bcrypt = require('bcrypt');
// const saltRounds = 10; // Number of salt rounds for hashing

app.post('/add-user', async (req, res) => {
    try {
        const {
            username,
            password,
            first_name,
            last_name,
            email,
            phone,
            street_address,
            city,
            state,
            zip,
            gender,
            role
        } = req.body;

        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert new user into the database
        await knex('employees').insert({
            username,
            password: hashedPassword,
            user_first_name: first_name,
            user_last_name: last_name,
            user_email_address: email,
            user_phone_number: phone,
            user_street: street_address,
            user_city: city,
            user_state: state.toUpperCase(),
            user_zip: zip,
            user_gender: gender,
            user_position: role
        });

        res.redirect('/user-manage'); // Redirect after successful addition
    } catch (error) {
        console.error('Error adding new user:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to user details page
app.get('/user-details/:id', (req, res) => {
const users = req.params.id


    knex('employees')
    .where('username', users)
    .first()
    .then(user => {
        res.render('user-details', { user })
    })
    .catch(error => {
        console.error('Error viewing user:', error);
        res.status(500).send('Internal Server Error');
    });

});

app.post('/update-user/:user', (req, res) => {
    const users = req.params.user

    const username = req.body.username
    const password = req.body.password;
    const first_name = req.body.first_name;
    const last_name = req.body.last_name;
    const email = req.body.email;
    const phone = req.body.phone;
    const street_address = req.body.street_address;
    const city = req.body.city;
    const state = req.body.state;
    const zip = req.body.zip;
    const gender = req.body.gender;
    const role = req.body.role;

    knex('employees')
    .where('username', users)
    .update({
        username : username,
        password : password,
        user_first_name : first_name,
        user_last_name : last_name,
        user_email_address : email,
        user_phone_number : phone,
        user_street : street_address,
        user_city : city,
        user_state : state,
        user_zip : zip,
        user_gender : gender,
        user_position : role
    })
    .then(() => {
        res.redirect('/user-manage')
    })
    .catch(error => {
        console.error('Error updating user:', error);
        res.status(500).send('Internal Server Error');
    });
});

app.post('/delete-user/:username', (req, res) => {
    const username = req.params.username
    console.log("Deleting user with username:", username);

    knex('employees')
    .where('username', username)
    .del()
    .then(() => {
        res.redirect('/user-manage');
    })
    .catch(error => {
        console.error('Error deleting user:', error);
        res.status(500).send('Internal Server Error');
    });
});

// --------------------------------------------------------------------------------------------------------------------------------------------
// Configure the server to start listening
app.listen(port, () => console.log(`Website is listening on port ${port}`));
