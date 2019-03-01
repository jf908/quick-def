const fs = require('fs').promises;
const service = require('restana')();
const bodyParser = require('body-parser');
const serveStatic = require('serve-static');
const env = process.env.NODE_ENV || 'dev';
service.use(bodyParser.json());

/**
 * Simple JSON Database
 */

function createDb(start) {
    return new Proxy(start, {
        set(obj, key, value) {
            obj[key] = value;
            fs.writeFile('db.json', JSON.stringify(obj));
        },
        deleteProperty(obj, key) {
            delete obj[key];
            fs.writeFile('db.json', JSON.stringify(obj));
        }
    });
}

let db = createDb({});

fs.readFile('db.json', 'utf8').then(file => {
    db = createDb(JSON.parse(file));
}).catch(err => {
    // Error reading db or missing
});

/**
 * Helpers
 */

function isNonEmptyString(value) {
    if(typeof value != 'string') return false;
    if(value === '') return false;
    return true;
}

service.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
});

/**
 * Web API
 */

service.use(serveStatic('client'));


service.get('/vue.js', async(req,res) => {
    const filename = env == 'dev' ? 'node_modules/vue/dist/vue.js' : 'node_modules/vue/dist/vue.min.js';
    res.send(await fs.readFile(filename, 'utf8'));
});

service.get('/all', async (req,res) => {
    res.send(db);
});

service.post('/add', async (req,res) => {
    if(!isNonEmptyString(req.body.term)
        || !isNonEmptyString(req.body.definition)) {
        return;
    }
    
    const def = {
        id: Math.random().toString(36).substr(2, 9),
        created: new Date().toISOString(),
        term: req.body.term,
        definition: req.body.definition,
        category: (typeof req.body.category == 'string') ? req.body.category : ''
    };

    db[def.id] = def;

    res.send(def);
});

service.post('/edit', async (req,res) => {
    if(db[req.params.id] === undefined) return;
    const id = req.body.id;

    if(isNonEmptyString(req.body.term)) {
        db[id].term = req.body.term;
    }

    if(isNonEmptyString(req.body.definition)) {
        db[id].definition = req.body.definition;
    }

    if(typeof req.body.category == 'string') {
        db[id].category = req.body.category;
    }

    res.send(db[id]);
});

service.post('/delete', async (req,res) => {
    if(db[req.body.id] === undefined) return;

    delete db[req.body.id];

    res.send({id: req.body.id});
});

/**
 * Start Server
 */

const port = 5678;
service.start(port).then(() => {
    console.log(`Listening on port ${port}`);
});