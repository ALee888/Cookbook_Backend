const { createServer } = require('http');
const { parse } = require('url');
const {readFile} = require('fs').promises;
const { MongoClient, ObjectId } = require('mongodb')
const recipes_db = require('./recipes_db.js');
const { format } = require('path');


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
    const headers = ['difficulty', 'tags']; // excluding name
    let htmlRecipes = '';
    for (let recipe of recipes) {
        htmlRecipes += `<tr><td><a href="/recipes/?_id=${recipe._id}">${recipe.title}</a></td>`;
        for (let header of headers) {
            htmlRecipes+=`
                <td>${recipe[header]}</td>
            `
        }
        htmlRecipes += '</tr>';
    }
    return htmlRecipes;
}

function formatRecipe(recipe, form) {
    const formatedRecipe = {
        _id: recipe._id,
        title: recipe.title,
        description: recipe.description,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        image: recipe.image,
        source: recipe.source
    }

    // Difficulty
    if (form=='insert') {
        switch (recipe.difficulty) {
            case 'Easy':
                formatedRecipe.difficulty = 'easy';
                break;
            case 'Medium':
                formatedRecipe.difficulty = 'medium';
                break;
            case 'Hard':
                formatedRecipe.difficulty = 'hard';
                break;
            default:
                formatedRecipe.difficulty = recipe.difficulty;
                break;
        }
    } else {
        formatedRecipe.difficulty = recipe.difficulty;
    }
    
    // Ingredients
    if (recipe.ingredients) {
        let htmlIngredients = '';
        if (form=="query") {
            for (const ingredient of recipe.ingredients) {
                htmlIngredients += `<div class="ingredient-item">${ingredient.amount} ${ingredient.name}</div>`
            }
        } else if (form=="insert") {
            for (const ingredient of recipe.ingredients) {
                htmlIngredients += `
                <div class="ingredient-row">
                    <div class="ingredient-amount">
                        <input type="text" name="ingredientAmounts" placeholder="Amount (e.g., 1 cup)" value="${ingredient.amount}" required>
                    </div>
                    <div class="ingredient-name">
                        <input type="text" name="ingredientNames" placeholder="Ingredient name (e.g., flour)" value="${ingredient.name}" required>
                    </div>
                </div>
                <button type="button" class="remove-btn" onclick="removeIngredient(this)">Remove</button>
            `;
            }
        }
        formatedRecipe.ingredients = htmlIngredients;
    }
    
    // Steps
    if (recipe.steps) {
        let htmlSteps = '';
        if (form=='query') {
            for (const step of recipe.steps) {
                htmlSteps += `<div class="step">${step}</div>`;
            }
        } else if (form=='insert') {
            for (const step of recipe.steps) {
                htmlSteps += `
                <div class="step-group">
                    <textarea name="steps" placeholder="Step-by-step instruction" required>${step}</textarea>
                    <button type="button" class="remove-btn" onclick="removeStep(this)">Remove</button>
                </div>
                `;
            }
        }
        formatedRecipe.steps = htmlSteps;
    }

    // Tags
    if (recipe.tags) {
        let htmlTags = '';
        if (form=='query') {
            for (const tag of recipe.tags) {
                htmlTags += `<span class="tag">${tag}</span>`;
            }
        } else if (form=='insert') {
            for (const tag of recipe.tags) {
                htmlTags += `<div class="tag-group">
                    <input type="text" name="tags" placeholder="Tag (e.g., vegetarian, quick-meal)" value="${tag}">
                    <button type="button" class="remove-btn" onclick="removeTag(this)">Remove</button>
                </div>`;
            }
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
                        if (query._id) {
                            // Get 1 recipe from database
                            const recipeData = await recipes_db.getRecipe(recipesCollection, new ObjectId(query._id));
                            // Render template with recipes data
                            const html = await renderTemplate('./templates/recipe_info.html', formatRecipe(recipeData, 'query'));
                            res.writeHead(200, {'Content-Type': 'text/html'});
                            res.end(html);
                        } else {
                            // get recipes from database
                            const recipesData = await recipes_db.getRecipes(recipesCollection, query);
                            // Render template with recipes data
                            const html = await renderTemplate('./templates/recipes.html', {
                                recipes: formatRecipes(recipesData)
                            });

                            res.writeHead(200, {'Content-Type': 'text/html'});
                            res.end(html);
                        }
                    } else if (path == '/recipes/insert' || path == '/recipes/insert/') {
                        if (query._id) {
                            console.log("id specified");
                            const recipeData = await recipes_db.getRecipe(recipesCollection, new ObjectId(query._id));
                            const html = await renderTemplate('./templates/recipe_insert.html', formatRecipe(recipeData, 'insert'));
                            res.writeHead(200, {'Content-Type': 'text/html'});
                            res.end(html);
                        } else {
                            console.log("id not specified");
                            const html = await renderTemplate('./templates/recipe_insert.html', {
                                _id: '',
                                title: '',
                                description: '',
                                prepTime: '',
                                cookTime: '',
                                servings: '',
                                difficulty: 'easy', // easy, medium, or hard
                                ingredients: [''],
                                steps: [''],
                                image: '',
                                source: '',
                                tags: ['']
                            }, 'insert');
                            res.writeHead(200, {'Content-Type': 'text/html'});
                            res.end(html);
                        }
                    } else {
                        res.writeHead(400);
                        res.end("Invalid path");
                    }
                    break;

                case 'POST':
                    // Get the request body
                    let body = [];
                    req.on('data', chunk => {
                        body.push(chunk);
                    })
                    req.on('end', async () => {
                        try {
                            const rawBody = Buffer.concat(body).toString();
                            const parsedBody = JSON.parse(rawBody);
                            console.log('received: ', parsedBody);

                            // Query based on the path
                            if (path == '/recipes/insert' || path == '/recipes/insert/') {
                                try {
                                    const insertedId = await recipes_db.insertRecipe(recipesCollection, parsedBody);
                                    res.writeHead(200);
                                    res.end(JSON.stringify({
                                        success: true,
                                        message: 'Recipe inserted Successfully',
                                        insertedId: insertedId
                                    }));
                                } catch (err) {
                                    res.writeHead(500);
                                    res.end(JSON.stringify({
                                        success: false,
                                        message: 'Failed to insert recipe',
                                        error: err.message
                                    }))
                                }

                            } else if (path == '/recipes/update' || path == '/recipes/update/') {
                                const { _id, ...updateData } = parsedBody;
                
                                // Validate _id exists
                                if (!_id) {
                                    res.statusCode = 400;
                                    return res.end(JSON.stringify({
                                        success: false,
                                        message: 'Missing recipe ID for update'
                                    }));
                                }

                                const result = await recipes_db.updateRecipe(
                                    recipesCollection, 
                                    ObjectId.createFromHexString(_id), 
                                    updateData
                                );

                                res.statusCode = 200;
                                res.end(JSON.stringify({
                                    success: true,
                                    message: 'Recipe updated successfully',
                                    modifiedCount: result.modifiedCount
                                }));
                            } else {
                                res.statusCode = 404;
                                res.end(JSON.stringify({
                                    success: false,
                                    message: 'Endpoint not found'
                                }));
                            }
                        } catch (err) {
                            console.log('try4')
                            throw err;
                        }
                    })
                    
                    break;

                case 'DELETE':
                    if (path == '/recipes' || path == '/recipes/') {
                        const response = await recipes_db.deleteRecipe(recipesCollection, new ObjectId(query.id));
                        res.writeHead(200, {'Content-Type': 'text/html'});
                        res.end(response);
                    }
                    break;
                default:
                    res.writeHead(405);
                    res.end('Method not allowed');
                    break;
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