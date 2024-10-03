"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Chatbox from "@/components/Chatbox";
import LoginContainer from "@/components/LoginContainer";
import ForwardModal from "@/components/ForwardModal";
import { AnimatePresence, motion } from "framer-motion";

export default function ChatSystem() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [showForwardModal, setShowForwardModal] = useState(false);

  const handleLogin = (name: string) => {
    setUsername(name);
    setIsLoggedIn(true);
    setOnlineUsers(["User1", "User2", "User3"]); // Example online users
  };

  const handleForward = () => {
    setShowForwardModal(true);
  };

  return (
    <div className="container mx-auto p-4 min-h-screen bg-background text-foreground">
      <AnimatePresence mode="wait">
        {isLoggedIn ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row h-[calc(100vh-2rem)] gap-4"
          >
            <Sidebar onlineUsers={onlineUsers} />
            <Chatbox username={username} onForward={handleForward} />
          </motion.div>
        ) : (
          <motion.div
            key="login"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.5 }}
          >
            <LoginContainer onLogin={handleLogin} />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showForwardModal && (
          <ForwardModal
            onlineUsers={onlineUsers}
            onClose={() => setShowForwardModal(false)}
            onForward={(user) => {
              console.log(`Forwarding to ${user}`);
              setShowForwardModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
