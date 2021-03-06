//Install express to create and configure a HTTP server
var express = require('express');
//Install sqlite3 to create and handle the databases
var sqlite3 = require('sqlite3').verbose();
//Install body parser to parse the data from the body
var bodyParser = require('body-parser');

//Create a HTTP server app
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

//Start the server.
var server = app.listen(8080);
console.log("Web service running on localhost:8080");

// import file system
var fs = require('fs');
var file = "crimes_pop.db";
var exists = fs.existsSync(file);

//====================JSON PARSING==============================
//Read in the CSV files and convert them into JSON
//formatted data
var crimes = JSON.parse(fs.readFileSync('crime_offences.json', 'utf8'));
var population = JSON.parse(fs.readFileSync('population.json', 'utf8'));

//====================DATABASE FILE CHECKING==============================
// check if the crimes db file exists
if(!exists) {
  console.log("Creating Crimes DB file.");
  fs.openSync(file, "w");
}

//====================DATABASE CREATION==============================
//Set up a databse using SQLite3 using the imported files
var db = new sqlite3.Database(file);

// Create the crime_offences database and populate the
// table with the JSON files
db.serialize(function() {
    // check to see of the database file already exists
    if(!exists) {
        //if the table doesn't exist continue to create the database and corresponding columns
        db.run('CREATE TABLE crime_offences(id INTEGER PRIMARY KEY AUTOINCREMENT, GardaStation Text, Crime Text, '
               + 'Y2006Q1 INTEGER, Y2006Q2 INTEGER, Y2006Q3 INTEGER, Y2006Q4 INTEGER, Y2011Q1 INTEGER, '
               + 'Y2011Q2 INTEGER, Y2011Q3 INTEGER, Y2011Q4 INTEGER)');
        var stmt = db.prepare('INSERT INTO crime_offences '
                              +'(GardaStation,Crime,Y2006Q1,Y2006Q2,Y2006Q3,Y2006Q4,Y2011Q1, '
                              +'Y2011Q2,Y2011Q3,Y2011Q4) VALUES (?,?,?,?,?,?,?,?,?,?)');
        
        //For each loop to populate the database with every JSON component
        crimes.forEach(function (fill) 
        {
            stmt.run(fill.GardaStation, fill.Crime, fill.Y2006Q1, fill.Y2006Q2, fill.Y2006Q3, fill.Y2006Q4, fill.Y2011Q1, fill.Y2011Q2,                             fill.Y2011Q3, fill.Y2011Q4);
        });
        
        stmt.finalize();
        
         //if the table doesn't exist contnue to create the table and corresponding columns
       db.run('CREATE TABLE population(id INTEGER PRIMARY KEY AUTOINCREMENT, Sex Text, Y2006 INTEGER, Y2011 INTEGER, City Text)');
       var stmt = db.prepare('INSERT INTO population (Sex, Y2006, Y2011, City) VALUES (?,?,?,?)');
       
        //For each loop to populate the databse with the JSON components
       population.forEach(function (fill) {
           stmt.run(fill.Sex, fill.Y2006, fill.Y2011, fill.City);
       }); 
        stmt.finalize();
    }
});

//close the connections
db.close();


//====================GET STATEMENTS==============================
//When a user goes to /, return a welcome string
app.get('/', function(req, res) {
    res.send("Welcome to the api.");
    console.log("Port 8080: Something is Happening!");
});

//When a user goes to /allp, return the population database entirely (tab formatted).
app.get('/allp', function(req, res){
    var db = new sqlite3.Database(file);
    console.log("Retrieving population data... ");
    db.all("SELECT * FROM population", function(err, row) {
    rowString = JSON.stringify(row, null, '\t');
    res.sendStatus(rowString);
  });
    db.close();
});

//When a user goes to /allc, return the population database (tab formatted).
app.get('/allc', function(req, res) {
    var db = new sqlite3.Database(file);
    console.log("Retrieving crime data... ");
    db.all("SELECT * FROM crime_offences", function(err, row) {
    rowString = JSON.stringify(row, null, '\t');
    res.sendStatus(rowString);
  });
    db.close();
});

//get id used for quickly testing the expected results from the post/put methods
app.get('/offenceId/:id', function(req, res) {
    var db = new sqlite3.Database(file);
    db.get("SELECT * FROM crime_offences WHERE id = ?", req.params.id, function(err, row) {
        
        if(row === undefined) {
            result.send("Could not find offence record with Id: " + req.params.id);
            res.send(result);
        }
        
        else {
            rowString = JSON.stringify(row, null, '\t');
            res.sendStatus(rowString);
            console.log("Found record with Id: " + req.params.id);
        }
        
    });
     db.close();
});

app.get('/populationId/:id', function(req, res) {
    var db = new sqlite3.Database(file);
    db.get("SELECT * FROM population WHERE id = ?", req.params.id, function(err, row) {
        
        if(row === undefined) {
            result.send("Could not find population record with Id: " + req.params.id);
            res.send(result);
        }
        
        else {
            rowString = JSON.stringify(row, null, '\t');
            res.sendStatus(rowString);
            console.log("Found record with Id: " + req.params.id);
        }
        
    });
     db.close();
});

//Query the crimes DB using parameters entered by the user to find data specific information about a particulr crime offence.
app.get('/crimesbyoffence/:offence', function(req, res) {
    var db = new sqlite3.Database(file);
    console.log("Using string " + req.params.offence + " to query the database");
    db.all("SELECT * FROM crime_offences WHERE Crime LIKE \"%"+ req.params.offence + "%\"", function(err, row) { 
        rowString = JSON.stringify(row, null, '\t');
        res.sendStatus(rowString);
    });
    db.close();
});

//Query the population DB using parameters entered by the user to find data specific information about population size by sex
app.get('/populationbysex/:sex', function (req, res) {
    var db = new sqlite3.Database(file);
    console.log("Using string " + req.params.sex + " to query the database");
    db.all("SELECT * FROM population WHERE Sex LIKE \"%" + req.params.sex + "%\"", function(err,row)
    {
        var rowString = JSON.stringify(row, null, '\t');
        res.sendStatus(rowString);
    });
    db.close();
});

/*
//Query to compare Crime Rates and total population by City
app.get('/compare/:offence/:city', function (req, res)
{
    var db = new sqlite3.Database(file);
    db.all("SELECT FROM crime_offences.GardaStation as Station, crime_offences.Crime as Crime, (crime_offences.Y2006Q1 + crime_offences.Y2006Q2 + crime_offences.Y2006Q3 + crime_offences.Y2006Q4 + crime_offences.Y2011Q1 + crime_offences.Y2011Q2 + crime_offences.Y2011Q3 + crime_offences.Y2011Q4) AS Total_Crimes, (population.Y2006 + population.Y2011) AS Total_Population, population.City as City FROM crime_offences LEFT JOIN population WHERE crime_offences.Crime LIKE \"%"+req.params.offence+"%\" AND population.City LIKE \"%"+req.params.city+"%\" ", function(err,row)
    {
        var rowString = JSON.stringify(row, null, '\t');
        res.sendStatus(rowString);
    });
    db.close();
});*/

//====================UPDATE STATEMENTS==============================
//Update the population of a certain year by a numerical amount
app.put('/updatePopulation/:id/:year/:total', function(req,res) {
    var db = new sqlite3.Database(file);
    
    db.all("UPDATE population SET Y"+req.params.year+" = "+req.params.year+ " WHERE id="+req.params.id+"", function(err,row) {
        res.sendStatus("Populaion with ID " + req.params.id + " of year " + req.params.total + " has been updated.");
    });
    db.close();
});

//Update the amount of crime offences for a year by a numerical amount
app.put('/updateCrime/:id/:year/:total', function(req,res) {
    var db = new sqlite3.Database(file);
    
    db.all("UPDATE crime_offences SET Y"+req.params.year+" = "+req.params.total+ " WHERE id="+req.params.id+"", function(err,row) {
        res.sendStatus("Crime Offence with ID " + req.params.id + " of year " + req.params.total + " has been updated.");
    });
    db.close();
});

//====================DELETE STATEMENTS==============================
//Query to delete a particualr record in the Crimes db by specific id
app.delete('/deleteCrime/:id', function (req, res) {
    var db = new sqlite3.Database(file);
    db.run("DELETE FROM crime_offences WHERE id =?", req.params.id, function(err, row)
    {
        // this.changes tells you how many changes were just made
        if (this.changes == 1) {
            result = "Deleted from Crimes with id: " +
                req.params.id + "\n";
            res.send(result);
            console.log("1 row deleted with ID: " + req.params.id);
        }
        else{
            result = "Could not find record with id: " +
                req.params.id + "\n";
            res.send(result);
            console.log("No rows deleted");
        }
    });
    db.close();
});

//Query to delete a particular record in the Population db by specific id
app.delete('/deletePopulation/:id', function (req, res) {
    var db = new sqlite3.Database(file);
    db.run("DELETE FROM population WHERE id =?", req.params.id, function(err, row)
    {
        // this.changes tells you how many changes were just made
        if (this.changes == 1) {
            result = "Deleted from Population with id: " +
                req.params.id + "\n";
            res.send(result);
            console.log("1 row deleted with ID: " + req.params.id);
        }
        else{
            result = "Could not find record with id: " +
                req.params.id + "\n";
            res.send(result);
            console.log("No rows deleted");
        }
    });
    db.close();
});
