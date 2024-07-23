const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const dbname = 'assessmenttasks';
const usersCollectionName = 'users';
const assessmentsCollectionName = 'assessments';
let usersCollection;
let assessmentsCollection;

const connectToDatabase = async () => {
  try {
    await client.connect();
    console.log(`Connected to the ${dbname} database`);
    const db = client.db(dbname);
    usersCollection = db.collection(usersCollectionName);
    assessmentsCollection = db.collection(assessmentsCollectionName);
  } catch (err) {
    console.error(`Error connecting to the database: ${err}`);
    process.exit(1);
  }
};

connectToDatabase();

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Bearer token
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// User registration
app.post('/register', async (req, res) => {
  const { username, password, email } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await usersCollection.insertOne({ username, password: hashedPassword, email });
    res.status(201).json({ message: 'User registered successfully', userId: result.insertedId });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error });
  }
});

// User login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await usersCollection.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ email: user.email, id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.json({ message: 'Login successful', token });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error });
  }
});

// Create an assessment
// Create an assessment without authentication
app.post('/assessments', async (req, res) => {
    const { title, description, dueDate } = req.body;
    try {
      // If you want to include userId, you might need to handle it differently.
      const result = await assessmentsCollection.insertOne({ title, description, dueDate });
      res.status(201).json({ message: 'Assessment created successfully', assessmentId: result.insertedId });
    } catch (error) {
      res.status(500).json({ message: 'Error creating assessment', error });
    }
  });
  

// Get all assessments (update based on your needs)
app.get('/assessments', async (req, res) => {
    try {
      // If authenticated, fetch specific user assessments, otherwise fetch all
      const assessments = await assessmentsCollection.find().toArray(); // or modify based on authentication
      res.json(assessments);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching assessments', error });
    }
  });
  
// Update an assessment
app.put('/assessments/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, description, dueDate } = req.body;
  try {
    const result = await assessmentsCollection.updateOne(
      { _id: ObjectId(id), userId: req.user.id },
      { $set: { title, description, dueDate } }
    );
    if (result.matchedCount > 0) {
      res.json({ message: 'Assessment updated successfully' });
    } else {
      res.status(404).json({ message: 'Assessment not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error updating assessment', error });
  }
});

// Delete an assessment
app.delete('/assessments/:id', async (req, res) => {
    const { id } = req.params;
    try {
      // Ensure to instantiate ObjectId correctly
      const result = await assessmentsCollection.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount > 0) {
        res.json({ message: 'Assessment deleted successfully' });
      } else {
        res.status(404).json({ message: 'Assessment not found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error deleting assessment', error });
    }
  });
  
  
  

app.get('/', (req, res) => {
  res.send({ success: 'Hello World' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
