const db = require('../../config/db');

module.exports = function(io, socket) {
  socket.on('join_trip_chat', (tripId) => {
    socket.join(`trip_${tripId}`);
    console.log(`User joined trip chat: ${tripId}`);
  });
  
  socket.on('send_message', async (messageData) => {
    try {
      const { tripId, senderId, content, attachmentUrl } = messageData;
      
      const result = await db.query(
        'INSERT INTO messages (id, trip_id, sender_id, content, attachment_url) VALUES(uuid_generate_v4(), $1, $2, $3, $4) RETURNING *',
        [tripId, senderId, content, attachmentUrl]
      );
      
      const newMessage = result.rows[0];
      
      const userResult = await db.query('SELECT username FROM users WHERE id = $1', [senderId]);
      const senderName = userResult.rows[0]?.username || 'Unknown User';
      
      io.to(`trip_${tripId}`).emit('receive_message', {
        ...newMessage,
        sender_name: senderName
      });
    } catch (error) {
      console.error('Error saving message:', error);
      socket.emit('message_error', { message: 'Failed to send message' });
    }
  });
  
  socket.on('typing', (data) => {
    socket.to(`trip_${data.tripId}`).emit('user_typing', {
      userId: data.userId,
      username: data.username,
      isTyping: data.isTyping
    });
  });
};