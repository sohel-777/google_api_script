const { google } = require('googleapis');
const path = require('path');

// Load the service account key JSON file
const KEYFILEPATH = path.join(__dirname, 'serviceAcountKEY.json');

// Define the required scopes
const SCOPES = ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets.readonly'];

const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});

const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });

module.exports = { sheets, drive };
