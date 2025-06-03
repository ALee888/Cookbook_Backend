const { createServer } = require('http');
const { parse } = require('url');
const {readFile} = require('fs').promises;
const { MongoClient, ObjectId } = require('mongodb')
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
            // console.log(`key: {{${key}}}`);
            // console.log(`value: ${value}`);
            template = template.replace((`{{${key}}}`), value);
        }

        // console.log('template: ', template);
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
        htmlRecipes += `<tr><td><a href="/recipe/?id=${recipe._id}">${recipe.title}</a></td>`;
        for (let header of headers) {
            htmlRecipes+=`
                <td>${recipe[header]}</td>
            `
        }
        htmlRecipes += '</tr>';
    }
    return htmlRecipes;
}

function formatRecipe(recipe) {
    const formatedRecipe = {
        _id: recipe._id,
        title: recipe.title,
        description: recipe.description,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
    }
    // Ingredients
    if (recipe.ingredients) {
        let htmlIngredients = '';
        for (const ingredient of recipe.ingredients) {
            htmlIngredients += `<div class="ingredient-item">${ingredient.amount} ${ingredient.name}</div>`
        }
        formatedRecipe.ingredients = htmlIngredients;
    }
    
    // Steps
    if (recipe.steps) {
        let htmlSteps = '';
        for (const step of recipe.steps) {
            htmlSteps += `<div class="step">${step}</div>`;
        }
        formatedRecipe.steps = htmlSteps;
    }

    // Tags
    if (recipe.tags) {
        let htmlTags = '';
        for (const tag of recipe.tags) {
            htmlSteps += `<span class="tag">${tag}</span>`;
        }
        formatedRecipe.tags = htmlTags;
    }

    return formatedRecipe;
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
                        // get recipes from database
                        const recipesData = await recipes_db.getRecipes(recipesCollection, query);
                        // Render template with recipes data
                        const html = await renderTemplate('./templates/recipes.html', {
                            recipes: formatRecipes(recipesData)
                        });

                        res.writeHead(200, {'Content-Type': 'text/html'});
                        res.end(html);

                    } else if (path == '/recipe' || path =='/recipe/') { 
                        // get recipes from database
                        // TODO: Error check id parameter
                        const recipeData = await recipes_db.getRecipe(recipesCollection, new ObjectId(query.id));
                        // Render template with recipes data
                        const html = await renderTemplate('./templates/recipe_info.html', formatRecipe(recipeData));
                        res.writeHead(200, {'Content-Type': 'text/html'});
                        res.end(html);

                    } else if (path === '/insert') {
                        const html = await renderTemplate('./templates/recipe_insert.html');
                        res.writeHead(200, {'Content-Type': 'text/html'});
                        res.end(html);

                    } else {
                        res.writeHead(400);
                        res.end("Invalid path");
                    }
                    break;
                case 'POST':

                case 'DELETE':
                    if (path == '/recipe' || path == '/recipe/') {
                        const response = await recipes_db.deleteRecipe(recipesCollection, new ObjectId(query.id));
                        res.writeHead(200, {'Content-Type': 'text/html'});
                        res.end(response);
                    }
                    break
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
    server.listen(3000, '0.0.0.0', () => console.log('Server running with DB Connected'));
}


try{
    startServer();
} catch (err) {
    console.err('failed to start', err);
}