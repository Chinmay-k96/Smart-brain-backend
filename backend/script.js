const express = require('express');
const knex = require('knex');
const bcrypt = require('bcrypt');
const cors = require('cors');
const Clarifai = require('clarifai');

const app2 = new Clarifai.App({
 apiKey: '4f5836374b464e80bba6fbda48e72a64'
});


const db = knex({
  	client: 'pg',
  	connection: {
	    host : '127.0.0.1',
	    user : 'postgres',
	    password : 'test',
	    database : 'smartbrain'
  	}
});


const app = express();

//app.use(express.urlencoded({extended: false}));
app.use(express.json());
app.use(cors());

app.get('/', (req,res) => {
	res.send('Yeah!!! its working');
});

app.post('/signin', (req,res)=>{
	if (!(req.body.email) || !(req.body.password)) {
		return res.status(400).json('Please enter valid credentials');
	}
	db.select('email', 'hash').from('login')
	.where('email','=', req.body.email)
	.then(data=> {
		const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
		if(isValid) {
		return db.select('*').from('users')
			.where('email', '=', req.body.email)
			.then(user=> {
				res.json(user[0])
			}).catch(err=> res.status(400).json('unable to get user'))
		} else {
			res.status(400).json('wrong credentials');
		}
	}).catch(err=> res.status(400).json('Wrong email'))	
})

app.post('/register', (req, res)=> {
	const { email, name, password } = req.body;
	if (!email || !password || !name) {
		return res.status(400).json('Please enter valid credentials');
	}
	const hash = bcrypt.hashSync(password, 5);
	db.transaction(trx=> {
		trx.insert({
			hash: hash,
			email: email
		})
		.into('login')
		.returning('email')
		.then(loginEmail => {
			return trx('users')
			.returning('*')
			.insert({
				email: loginEmail[0],
				name: name,
				joined: new Date()
			}).then(user=> {
				res.json(user[0]);
			})
		})
		.then(trx.commit)
		.catch(trx.rollback)
	})
	.catch(err=> res.status(400).json('unable to register'))
})

app.put('/image', (req, res)=> {
	const { id } = req.body;
	db('users').where('id', '=', id)
	.increment('entries', 1)
	.returning('entries')
	.then(entries=> {
		res.json(entries[0]);
	})
	.catch(err=> res.status(400).json('unable to get entries'))
})

app.post('/imageUrl',(req, res)=> {
	app2.models.predict(Clarifai.FACE_DETECT_MODEL, req.body.input)
	.then(data=>{ res.json(data);
	}).catch(err=> res.status(400).json('unable to call api'))
})

app.listen(process.env.PORT || 3001, ()=>{
	console.log(`app is running on port ${process.env.PORT}`);
})