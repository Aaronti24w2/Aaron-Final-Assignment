const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const uri = "mongodb+srv://Aaronti24w1:Ah251102@aaronfinalassignmentclu.roxb6m2.mongodb.net/ExpenseTracker?retryWrites=true&w=majority&appName=AaronFinalAssignmentCluster";
const path = require ('path');
const cookieParser = require('cookie-parser');


const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//connects to mongodb
mongoose.connect(uri)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('Error connecting to MongoDB Atlas:', err));

//expense model

const Expense = mongoose.model('Expense', {
  description: String,
  amount: Number,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

// user model
const User = mongoose.model('User', {
  username: String,
  email: String,
  password: String
});

//extract userId
function authenticateToken(req, res, next) {
  const token = req.cookies.token;

  //console.log('Received token:', token)

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, 'secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    //console.log('User object from token:', user);
    next();
  });
}

app.use (authenticateToken)

// Sign up flow
app.post('/api/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    console.log('Received request body:', req.body);

    // Check if email already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "The email already exists"});
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword
    });

    // Save user and generate password token
    await newUser.save();

    // Redirect to the expense_tracker page after successful sign up
    res.redirect('/login.html');
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// login flow
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user's details exist in the database
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Compare password with hashed password
    const passwordMatch = bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, 'secret');

    // Respond with token
    res.cookie('token', token);
    res.redirect('/expense_tracker.html');
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});


//get all expenses for user flow

app.get('/api/expenses', async (req, res) => {
  try {

    const expenses = await Expense.find({ userId: req.user.userId });
    res.json(expenses);

  } catch (err) {

    console.error (err);
    res.status(500).json({ message: 'Server Error' });

  }
})


//create expenses flow

app.post('/api/expenses', async (req, res) => {
  try {
    const {description, amount} = req.body;

    console.log('Received expense data:', description, amount);
    console.log('User object:', req.user);


    if (!req.user || !req.user.userId) {
      return res.status(401).json({message: 'Unauhorized'});
    }
  
    const userId = req.user.userId;
    console.log('User ID:', userId);

    const newExpense = new Expense({description, amount, userId});
    console.log('New Expense:', newExpense);

    await newExpense.save();
    console.log('Expense saved successfully:', newExpense);

    res.status(201).json(newExpense);
  } catch (err) {
    console.error(err);
    res.status(500).json({message: 'server error'});
  }
});



// delete expense flow
app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // find expense by id
    const deletedExpense = await Expense.findByIdAndDelete(id);

    // no expense found, then return 404
    if (!deletedExpense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    //  if deleted successfuly, send response
    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});



app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
})

app.get('/expense_tracker', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'expense_tracker.html'));
})
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));