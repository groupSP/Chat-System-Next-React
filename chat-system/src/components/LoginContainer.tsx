import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface LoginContainerProps {
  onLogin: (username: string) => void;
}

export default function LoginContainer({ onLogin }: LoginContainerProps) {
  const [username, setUsername] = useState("");

  return (
    <div className="flex items-center justify-center h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">
            Welcome to Chat System
          </CardTitle>
          <CardTitle className="text-sm font-thin text-center text-gray-400">
            Actually what you type here doesn't matter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="space-y-4"
          >
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name"
              className="text-lg"
            />
            <Button
              onClick={() => onLogin(username)}
              className="w-full text-lg"
            >
              Login
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </div>
  );
}
