const { createServer } = require('http');
const { parse } = require('url');
const fs = require('fs');
const { MongoClient } = require('mongodb')
const recipes_db = require('./recipes_db.js');

async function startServer() {
    // Connect to db
    const client = await MongoClient.connect(recipes_db.getURI());
    console.log("connected to mongo client");
    const db = client.db('recipe_app');
    const recipesCollection = db.collection('recipes');

    // Create HTTP Server
    const server = createServer(function (req, res) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        var query = parse(req.url, true).query;
        switch (query.method) {
            case 'GET':
                try {
                    recipes_db.getRecipes(recipesCollection, query);
                } catch (err) {
                    console.error("Error querying documents");
                }
                break;
            case 'POST':
                try {
                    recipes_db.insertRecipe(recipesCollection, query)    
                } catch {
                    console.error("Error inserting");
                }
                break;
            case 'DELETE':
                break;
            case 'RESET':
                recipes_db.setupRecipeDatabase();
                break;
        }
        res.end();
    });
    server.listen(3000, () => console.log('Server running with DB Connected'));
}


try{
    startServer();
} catch (err) {
    console.err('failed to start', err);
}