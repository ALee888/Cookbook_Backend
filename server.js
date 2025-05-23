const http = require('http');
const url = require('url');
const recipesDB = require('./recipes_db');

const hostname = '127.0.0.1';
const port = 3000;


const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    console.log("Tester");
    const dbClient = mongoClient;
    try {
        const client = await recipesDB.getClient();
        await client.connect();
        console.log("Connected to MongoDB server");
        
        
    }
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}: ${port}`);
});