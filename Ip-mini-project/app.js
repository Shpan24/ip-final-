const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const port = 3000;

const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});
const io = require('socket.io')(server)

require("./server.js");

const static_path = path.join(__dirname, "./public");
let socketsConected = new Set()

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(express.static(static_path));
app.engine("html", require("ejs").renderFile);
app.set("view engine", "html");

app.get("/", (req, res) => {
  res.render(path.join(__dirname, "views/index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views/loginSignUp.html"));
});

app.get("/products", (req, res) => {
  res.sendFile(path.join(__dirname, "views/products.html"));
});

app.get("/payment", (req, res) => {
  res.sendFile(path.join(__dirname, "views/payment.html"));
});

app.get("/chat", (req, res) => {
  res.sendFile(path.join(__dirname, "views/chat.html"));
});
app.get("/about", (req, res) => {
  res.sendFile(path.join(__dirname, "views/about.html"));
});

io.on('connection', onConnected)
function onConnected(socket) {
  console.log('Socket connected', socket.id)
  socketsConected.add(socket.id)
  io.emit('clients-total', socketsConected.size)

  socket.on('disconnect', () => {
    console.log('Socket disconnected', socket.id)
    socketsConected.delete(socket.id)
    io.emit('clients-total', socketsConected.size)
  })

  socket.on('message', (data) => {
    // console.log(data)
    socket.broadcast.emit('chat-message', data)
  })

  socket.on('feedback', (data) => {
    socket.broadcast.emit('feedback', data)
  })
}


// Create a user model
const User = mongoose.model("User", {
  username: String,
  email: String,
  password: String,
});

app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check if the email is already taken
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).send("Email already taken");
    }

    // Hash the password before saving it
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const user = new User({
      username,
      email,
      password: hashedPassword, // Store the hashed password
    });

    // Generate a JWT token
    const token = jwt.sign({ userId: user.id }, "secret", {
      expiresIn: "1h",
    });

    // Save the token to the user document (if needed)
    user.token = token;

    await user.save();

    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).send("Invalid email or password");
    }

    // Verify the entered password against the stored hashed password
    if (!password || !user.password) {
      return res.status(400).send("Password not provided or invalid format");
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).send("Invalid email or password");
    }

    // Password is correct; generate a new JWT token
    const token = jwt.sign({ userId: user.id }, "secret", {
      expiresIn: "1h",
    });

    // Update the user's token in the database (if needed)
    user.token = token;
    await user.save();

    // Redirect to the root route
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

// Create a protected route
app.get("/protected", (req, res) => {
  // Check if the user is authenticated
  const token = req.headers["Authorization"];

  if (!token) {
    res.status(401).send("Unauthorized");
  }

  // Try to verify the token
  try {
    const decoded = jwt.verify(token, "secret");

    // If the token is valid, return the protected resource
    res.send("This is a protected resource");
  } catch (err) {
    // If the token is invalid, return an error
    res.status(401).send("Unauthorized");
  }
});

app.post("/logout", (req, res) => {
  // Implement logout logic (clear token or session)
  req.isLoggedIn = false;
  res.redirect("/");
});
