require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;


// Use the API key from the environment variable for security
// const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Serve the client files
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Function to get bot responses from OpenAI
async function getBotResponse(message, retries = 3) {
  // const url = 'https://api.openai.com/v1/chat/completions'; // OpenAI API endpoint
  try {
      const response = await axios.post(url, {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: message }],
      }, {
          headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
          },
      });

      // Return the response text from OpenAI
      return response.data.choices[0].message.content;
  } catch (error) {
      if (error.response && error.response.status === 429 && retries > 0) {
          // Wait for a short period before retrying
          console.log('Rate limit exceeded. Retrying...');
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2 seconds
          return getBotResponse(message, retries - 1); // Retry the request
      }

      console.error('Error fetching from OpenAI:', error);
      return 'Sorry, I encountered an error while trying to respond.';
  }
}

// Handle socket connections
io.on('connection', (socket) => {
  console.log('A user connected');

  // Listen for messages from the client
  socket.on('chat message', async (msg) => {
    console.log('Message received: ' + msg);
    
    // Get the bot response using the OpenAI API
    const botResponse = await getBotResponse(msg);
    socket.emit('chat message', botResponse);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
