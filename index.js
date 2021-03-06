const express = require('express');
const bcrypt = require('bcryptjs');
const session = require('express-session');
var KnexSessionStore = require('connect-session-knex')(session);

const db = require('./database/dbConfig.js');

const server = express();

const sessionConfig = {
    name : 'daisy',
    secret : 'sessionsession',
    cookie : {
        maxAge : 1000 * 60 * 10,
        secure : false
    },
    httpOnly : true,
    resave : false ,
    saveUninitialized : false,
    store : new KnexSessionStore({
          tablename : 'sessions',
          sidfeildname : 'sid',
          knex : db,
          createtable : true,
          clearInterval : 1000 * 60 * 10,
    }),
};

server.use(express.json());
server.use(session(sessionConfig));

server.get('/api', (req, res) => {
    res.send('Its Alive!');      
})

function protected(req, res, next) {
      if(req.session && req.session.userId) {
          next()  //user LoggedIn go ahead...
      } else {
          //bounce ...
          res.status(401).json({message : 'Invalid User...'})
      }
}

//GET  USERS.. to see all registered USERS..(WHICH NEED TO BE PTOTECTED...)
server.get('/api/users', protected, (req, res) => {
    db('users')
        .select('id', 'username', 'password') 
        .then(users => {
            res.json(users);
         })
        .catch(err => res.send(err));
});

//GET  USER.. to see only LoggedIn USER...
server.get('/api/me', protected, (req, res) => {
    db('users')
        .select('id', 'username', 'password') 
        .where({id : req.session.userId})
        .first()
        .then(loggedInUser => {
            res.json(loggedInUser);
         })
        .catch(err => res.send(err));
});


//USER REGISTER... INTO DATABASE 'USERS'
server.post('/api/register', (req, res) => {
    const credentials = req.body;
    const hash = bcrypt.hashSync(credentials.password, 1);
    credentials.password = hash;
    db('users').insert(credentials)
               .then(ids => {
                    res.status(201).json(ids);
                })
               .catch(err => res.send(err));
});

//USER LOGIN...To check uthenticated users
server.get('/api/login', (req, res) => {
    const credentials = req.body;
    db('users')
        .where({username : credentials.username})
        .first()
        .then(user => {
             if(user && bcrypt.compareSync(credentials.password, user.password)) {
                req.session.userId = user.id; 
                res.status(200).json({message : "Logged In"})
             } else {
                 res.status(401).json({message : "Invalid username or password.."})
             }
         })
        .catch(err => res.send(err));
});
  
//USER  LOGOUT...
server.get('/api/logout', (req, res) => {
     if(req.session) {
         req.session.destroy(err => {
               if(err) {
                   res.send('Can not LOGOUT..');
               } else {
                   res.send('bye');
               }
         });
     }
});


server.listen(9000, () => console.log("Running on port : 9000"));