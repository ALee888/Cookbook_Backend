const mongoClient = require('mongodb');
const env = require('dotenv').config();
// Database and collection names
const DB_NAME = "recipe_app";
const RECIPES_COLLECTION = "recipes";

// Get DB info from env file
function getURI() {
    const dbConfig = {
        user: process.env.DB_USER,
        pass: process.env.DB_PASS,
        ip: process.env.DB_IP,
        port: process.env.DB_PORT
    };
    return `mongodb://${dbConfig.user}:${dbConfig.pass}@${dbConfig.ip}:${dbConfig.port}/?authSource=admin`
}

// Build a recipe from query results
function buildRecipe(query) {
    var recipe = {};
    for (let key in query) {
        if (key != 'method') {
            recipe[key] = query[key]
        }
    }
    console.log("new recipe: ", recipe);
    return recipe;
}

const recipeTemplate = {
    title: "",
    description: "",
    ingredients: [
      { name: "NA", amount: "NA" },
    ],
    steps: [],
    prepTime: 0,
    cookTime: 0,
    servings: 0,
    difficulty: "NA",
    tags: [],
    createdAt: new Date()
}

const sampleRecipes = [
    {
      title: "Spaghetti Carbonara",
      description: "Classic Italian pasta dish with eggs, cheese, and pancetta",
      ingredients: [
        { name: "Spaghetti", amount: "400g" },
        { name: "Pancetta", amount: "150g" },
        { name: "Eggs", amount: "3" },
        { name: "Parmesan cheese", amount: "50g" },
        { name: "Black pepper", amount: "to taste" }
      ],
      steps: [
        "Boil spaghetti until al dente",
        "Fry pancetta until crispy",
        "Beat eggs with grated parmesan",
        "Drain pasta, mix with pancetta, then quickly stir in egg mixture",
        "Season with black pepper and serve immediately"
      ],
      prepTime: 10,
      cookTime: 15,
      servings: 4,
      difficulty: "Medium",
      tags: ["Italian", "Pasta", "Quick Meal"],
      createdAt: new Date()
    },
    {
      title: "Chocolate Chip Cookies",
      description: "Classic homemade chocolate chip cookies",
      ingredients: [
        { name: "All-purpose flour", amount: "2 1/4 cups" },
        { name: "Butter", amount: "1 cup" },
        { name: "Brown sugar", amount: "3/4 cup" },
        { name: "White sugar", amount: "3/4 cup" },
        { name: "Eggs", amount: "2" },
        { name: "Chocolate chips", amount: "2 cups" },
        { name: "Vanilla extract", amount: "1 tsp" },
        { name: "Baking soda", amount: "1 tsp" },
        { name: "Salt", amount: "1 tsp" }
      ],
      steps: [
        "Preheat oven to 375°F (190°C)",
        "Cream together butter and sugars",
        "Beat in eggs and vanilla",
        "Mix in dry ingredients",
        "Stir in chocolate chips",
        "Drop by spoonfuls onto baking sheets",
        "Bake for 9-11 minutes until golden brown"
      ],
      prepTime: 20,
      cookTime: 10,
      servings: 24,
      difficulty: "Easy",
      tags: ["Dessert", "Baking", "Cookies"],
      createdAt: new Date()
    }
];

// TODO: Function description
async function setupRecipeDatabase(db, recipesCollection) {
    try {
        // Delete existing collections if they 
        const collectionsToDelete = await db.listCollections().toArray();
        const collectionNames = collectionsToDelete.map(c => c.name);
        if (collectionNames.includes(RECIPES_COLLECTION)) {
            await db.dropCollection(RECIPES_COLLECTION);
            console.log(`Dropped existing collection: ${RECIPES_COLLECTION}`);
        }

        // Insert Sample recipes
        await insertRecipe(recipesCollection);

        // Create indexes
        await recipesCollection.createIndex({ title: "text", description: "text" });
        await recipesCollection.createIndex({ tags: 1 });
        await recipesCollection.createIndex({ difficulty: 1 });
        await recipesCollection.createIndex({ createdAt: -1 });
        console.log("Created indexes for optimal query performance");

        // Verify setup
        const count = await recipesCollection.countDocuments();
        console.log(`Current recipe count: ${count}`);

        console.log("\nSample query results:");
        console.log("1. All Italian recipes:");
        const italianRecipes = await recipesCollection.find({ tags: "Italian" }).toArray();
        console.log(italianRecipes.map(r => r.title));

        console.log("\n2. Easy difficulty recipes:");
        const easyRecipes = await recipesCollection.find({ difficulty: "Easy" }).toArray();
        console.log(easyRecipes.map(r => r.title));

        console.log("\n3. Full-text search for 'chocolate':");
        const chocolateRecipes = await recipesCollection.find({ $text: { $search: "chocolate" } }).toArray();
        console.log(chocolateRecipes.map(r => r.title));

    } catch (err) {
        console.log("TODO: Remove me");
        console.error("error setting up database:", err);
    } finally {
        // close the connection
        await client.close();
        console.log("Disconnected from MongoDB");
    }
}

/*
CRUD OPERATIONS
*/

// Get all recipes
async function getRecipes(recipesCollection, query) {
    console.log(query);
    const results = await recipesCollection.find(query).toArray();
    console.log("All recipes: ", results);
    return results;
}

async function getRecipe(recipesCollection, id) {
    return document = await recipesCollection.findOne({ _id: id});
}

// Insert one or more recipes
async function insertRecipe(recipesCollection, query) {
    var recipe = buildRecipe(query);
    const insertResult = await recipesCollection.insertOne(recipe);
    console.log(`Inserted ${insertResult.insertedId} sample recipes`);
}

async function deleteRecipe(recipesCollection, id) {
    try  {
        const result = await recipesCollection.deleteOne({_id: id});
        if (result.deletedCount === 1) {
            let res = "Successfully delted one document";
            console.log(res);
            return res
        } else {
            let res = "No documents matched the query. Deleted 0 documents.";
            console.log(res);
            return res;
        }
    } catch (err) {
        console.error(`Error deleting recipe: ${id}`);
        throw err;
    }
}
exports.getURI = getURI;
exports.setupRecipeDatabase = setupRecipeDatabase;
exports.getRecipes = getRecipes;
exports.getRecipe = getRecipe;
exports.insertRecipe = insertRecipe;
exports.deleteRecipe = deleteRecipe;