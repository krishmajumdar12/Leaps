import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './ChatWindow.css';

const ENDPOINT = 'http://localhost:3000';

function ChatWindow({ tripId, userId }) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const [attachmentUrl, setAttachmentUrl] = useState(null);


  
 useEffect(() => {
    const newSocket = io(ENDPOINT);
    setSocket(newSocket);
    
    return () => newSocket.disconnect();
  }, []);
  
  useEffect(() => {
    if (socket && tripId) {
      socket.emit('join_trip_chat', tripId);
      
      const fetchMessages = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`http://localhost:3000/api/messages/trip/${tripId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            }
          });
          const data = await res.json();
          
          if (Array.isArray(data) && data.length > 0) {
            setMessages(data);
            localStorage.setItem(`chat_messages_${tripId}`, JSON.stringify(data));
          } else {
            const savedMessages = localStorage.getItem(`chat_messages_${tripId}`);
            if (savedMessages) {
              try {
                setMessages(JSON.parse(savedMessages));
              } catch (e) {
                console.error('Error parsing saved messages:', e);
                setMessages([]);
              }
            }
          }
        } catch (error) {
          console.error('Error fetching messages:', error);
          
          const savedMessages = localStorage.getItem(`chat_messages_${tripId}`);
          if (savedMessages) {
            try {
              setMessages(JSON.parse(savedMessages));
            } catch (e) {
              console.error('Error parsing saved messages:', e);
              setMessages([]);
            }
          }
        }
      };
      
      fetchMessages();
      
      // Listen for new messages
      socket.on('receive_message', (message) => {
        setMessages(prevMessages => {
          const updatedMessages = Array.isArray(prevMessages) 
            ? [...prevMessages, message] 
            : [message];
          
          localStorage.setItem(`chat_messages_${tripId}`, JSON.stringify(updatedMessages));
          return updatedMessages;
        });
      });
      
      socket.on('user_typing', (data) => {
        if (data.userId !== userId) {
          if (data.isTyping) {
            setTypingUsers(prev => 
              prev.includes(data.username) ? prev : [...prev, data.username]
            );
          } else {
            setTypingUsers(prev => 
              prev.filter(username => username !== data.username)
            );
          }
        }
      });
    }
    
    return () => {
      if (socket) {
        socket.off('receive_message');
        socket.off('user_typing');
      }
    };
  }, [socket, tripId, userId]);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Auto-scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Handle sending a message
  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !attachmentUrl) return; 

    const messageData = {
      tripId,
      senderId: userId,
      content: newMessage,
      attachmentUrl 
    };
    
    socket.emit('send_message', messageData);
    setNewMessage('');
    setAttachmentUrl(null);
    setIsTyping(false);
  };
  
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (!isTyping && socket) {
      setIsTyping(true);
      socket.emit('typing', {
        tripId,
        userId,
        username: localStorage.getItem('username'),
        isTyping: true
      });
    }
    
    const lastTypingTime = new Date().getTime();
    setTimeout(() => {
      const timeNow = new Date().getTime();
      const timeDiff = timeNow - lastTypingTime;
      if (timeDiff >= 2000 && isTyping && socket) {
        socket.emit('typing', {
          tripId,
          userId,
          username: localStorage.getItem('username'),
          isTyping: false
        });
        setIsTyping(false);
      }
    }, 2000);
  };
  
  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen) {
      setTimeout(scrollToBottom, 300);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
  
      const res = await fetch('http://localhost:3000/api/messages/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // Do NOT set 'Content-Type' when using FormData; the browser does it for you
        },
        body: formData
      });
  
      if (!res.ok) throw new Error('File upload failed');
      const data = await res.json();
      // 'data.url' should be the publicly accessible file URL returned by your server
      setAttachmentUrl(data.url);
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  function linkify(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, function(url) {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
  }

  return (
    <>
      {/* Chat Button */}
      <button 
        className="chat-button" 
        onClick={toggleChat}
        aria-label="Chat"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>
      
      {/* Chat Window */}
      <div className={`chat-window ${isChatOpen ? '' : 'hidden'}`}>
        <div className="chat-header">
          <h3>Trip Chat</h3>
          <button className="close-chat" onClick={toggleChat}>×</button>
        </div>
        
        <div className="messages-container">
          {Array.isArray(messages) && messages.length > 0 ? (
            messages.map((message, index) => {
              const isSent = message.sender_id === userId;
              const messageColor = isSent ? '#7691ff' : '#f0f0f0';
              return (
                  <div
                      key={index}
                      className={`message ${isSent ? 'sent' : 'received'}`}
                      style={{ backgroundColor: messageColor }}
                  >
                      {message.sender_id !== userId && (
                          <div className="sender-name">{message.sender_name}</div>
                      )}

                      {message.attachment_url && (
                        <div className="attachment">
                          <a href={message.attachment_url} target="_blank" rel="noopener noreferrer">
                            View Attachment
                          </a>
                        </div>
                      )}
                  
                      <div 
                        className="message-content"
                        dangerouslySetInnerHTML={{ __html: linkify(message.content) }}
                      />
                      <div className="message-timestamp">
                          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                  </div>
              );
            })
          ) : (
            <div className="no-messages">No messages yet. Start the conversation!</div>
          )}
          
          {typingUsers.length > 0 && (
            <div className="typing-indicator">
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <form onSubmit={sendMessage} className="message-input-form">
          <label className="file-attachment-label">
            <input 
              type="file"
              onChange={handleFileChange}
              style={{ display: 'none' }} 
            />
            📎
          </label>

          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder="Type a message..."
            className="message-input"
          />
          <button type="submit" className="send-button" disabled={!newMessage.trim() && !attachmentUrl}>
            <span>↑</span>
          </button>
        </form>
      </div>
    </>
  );
}

export default ChatWindow;