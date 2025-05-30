const { createServer } = require('http');
const { parse } = require('url');
const {readFile} = require('fs').promises;
const { MongoClient } = require('mongodb')
const recipes_db = require('./recipes_db.js');


async function renderTemplate(templatePath, data = {}) {
    try {
        // let template = await fs.readFile(templatePath, 'utf-8', (err) => {
        //     if (err) throw err;
        //     console.log("Error reading file:", err);
        // });
        let template = await readFile(templatePath, 'utf-8');
        
        // Replace placeholders like {{recipes}} with recipe data
        for (const [key, value] of Object.entries(data)) {
            template = template.replace((`{{${key}}}`, 'g'), value);
        }

        console.log('template: ', template);
        return template;
    }
    catch (err) {
        console.error('Error rendering template:', err);
        throw err;
    }
}

function formatRecipes(recipes) {
    console.log("recipes: ", recipes);
    const headers = ['difficulty', 'tags']; // excluding name
    let htmlRecipes = '';
    for (let recipe of recipes) {
        htmlRecipes += `<tr><td><a href="/recipe/${recipe._id}">${recipe.title}</a></td>`;
        for (let header of headers) {
            htmlRecipes+=`
                <td>${recipe[header]}</td>
            `
        }
        htmlRecipes += '</tr>';
    }
    return htmlRecipes;

    // return recipes.map(recipe => `
    //     <tr>
    //         <td><a href="/recipe/${recipe._id}">${recipe.title}</a></td>
    //         <td>${recipe.difficulty}</td>
    //         <td>${recipe.tags}</td>
    //     </tr>
    // `).join('');
}

async function startServer() {
    // Connect to db
    const client = await MongoClient.connect(recipes_db.getURI());
    console.log("connected to mongo client");
    const db = client.db('recipe_app');
    const recipesCollection = db.collection('recipes');

    // Create HTTP Server
    const server = createServer(async function (req, res) {
        const url_parsed = parse(req.url, true);
        const path = url_parsed.pathname
        const query = url_parsed.query
        console.log("\nmethod: ", req.method);
        console.log("body: ", req.body);
        console.log("Path: ", path);
        console.log("query: ", query);
        try {
            switch (req.method) {
                case 'GET':
                    if (path == '/recipes' || path == '/recipes/' ) {
                        // Qget recipes from database
                        const recipesData = await recipes_db.getRecipes(recipesCollection, query);
                        // Render template with recipes data
                        const html = await renderTemplate('./templates/recipes.html', {
                            recipes: formatRecipes(recipesData)
                        });
                        
                        res.writeHead(200, {'Content-Type': 'text/html'});
                        res.end(html);
                    } else if (path === '/insert') {
                        fs.readFile('./templates/recipe_insert.html', function(err, data) {
                            if (err) {
                                console.error("Error reading file", err);
                                res.end();
                                return;
                            }
                            res.write(data);
                            console.log("Return insert form");
                            res.end();
                        });
                    } else {
                        res.end();
                    }
                    break;
                case 'POST':
                    try {
                        recipes_db.insertRecipe(recipesCollection, req.body)  
                        res.end();
                    } catch {
                        console.error("Error inserting");
                        res.end();
                    }
                    break;
                case 'DELETE':
                    res.writeHead(404)
                    res.end("Method not implemented");
                    break;
                default:
                    res.writeHead(405);
                    res.end('Method not allowed');
            }
        } catch (err) {
            console.error('Server error:', err);
            res.writeHead(500);
            res.end('Internal server error');
        }
    });
    server.listen(3000, () => console.log('Server running with DB Connected'));
}


try{
    startServer();
} catch (err) {
    console.err('failed to start', err);
}