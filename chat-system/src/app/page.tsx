'use client';

import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Chatbox from '../components/Chatbox';
import LoginContainer from '../components/LoginContainer';
import ForwardModal from '../components/ForwardModal';

export default function ChatSystem() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [showForwardModal, setShowForwardModal] = useState(false);

  const handleLogin = (name: string) => {
    setUsername(name);
    setIsLoggedIn(true);
    // Here you would typically connect to your backend and get the list of online users
    setOnlineUsers(['User1', 'User2', 'User3']); // Example online users
  };

  const handleForward = () => {
    setShowForwardModal(true);
  };

  return (
    <div className="container mx-auto p-4">
      {isLoggedIn ? (
        <div className="flex">
          <Sidebar onlineUsers={onlineUsers} />
          <Chatbox onForward={handleForward} />
        </div>
      ) : (
        <LoginContainer onLogin={handleLogin} />
      )}
      {showForwardModal && (
        <ForwardModal
          onlineUsers={onlineUsers}
          onClose={() => setShowForwardModal(false)}
          onForward={(user: string) => {
            console.log(`Forwarding to ${user}`);
            setShowForwardModal(false);
          }}
        />
      )}
    </div>
  );
}