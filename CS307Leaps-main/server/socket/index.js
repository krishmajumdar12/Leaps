const messageHandlers = require('./handlers/messages');

function initializeSocket(io) {

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    // Register message handlers
    messageHandlers(io, socket);
    
    // for voting:
    // tripHandlers(io, socket);
    
    // Disconnect handler
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
  
  return io;
}

module.exports = { initializeSocket };