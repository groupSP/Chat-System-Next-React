import { useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, FileUp, Forward } from "lucide-react";
import { Message, User } from "@/app/page";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatboxProps {
  // onForward: () => void;
  messages: Message[];
  sendMessage: (message: string, recipient: string) => void;
  username: string;
  userID: string;
  onlineUsers: User[];
}

export default function Chatbox({
  messages,
  sendMessage,
  username,
  userID,
  onlineUsers,
}: ChatboxProps) {
  const [message, setMessage] = useState("");
  const [recipient, setRecipient] = useState("public_chat");

  const handleSendMessage = () => {
    console.log(`Sending message to ${recipient}: ${message}`);
    sendMessage(message, recipient);
    setMessage("");
  };

  const handleSendFile = () => {
    console.log("Sending file");
  };

  return (
    <Card className="w-full md:w-2/3 lg:w-3/4 flex flex-col">
      <CardHeader>
        <CardTitle className="font-thin pb-1">username: {username}</CardTitle>
        <CardTitle className="font-thin pb-6">userID: {userID}</CardTitle>
        <CardTitle className="text-2xl font-bold">Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-[calc(100vh-16rem)]">
          <div id="chat-messages" className="space-y-4">
            <ul className="space-y-4">
              {messages.map((message, index) => (
                <li
                  key={index}
                  className="flex items-start space-x-4 pb-3 border border-gray-200 rounded-2xl p-4 bg-slate-100"
                >
                  <div className="flex-shrink-0">
                    <Avatar>
                      <AvatarImage
                        src={`https://api.dicebear.com/6.x/initials/svg?seed=${message.displayName()}`}
                        alt={message.displayName()}
                      />
                      <AvatarFallback>
                        {message.displayName()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-grow">
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-500 text-sm">
                        {message.displayName()}
                      </span>
                      <span className="font-sans mt-1">
                        {message.content}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <div className="flex space-x-2 w-full">
          <Input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-grow"
          />
          <Select value={recipient} onValueChange={setRecipient}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select recipient" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public_chat">Group Chat</SelectItem>
              {onlineUsers.map((user) => (
                <SelectItem key={user.publicKey} value={user.id}>
                  {user.username ?? user.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleSendMessage}>
            <Send className="mr-2 h-4 w-4" /> Send
          </Button>
          <Input type="file" id="file-input" className="hidden" />
          <Button variant="secondary" onClick={handleSendFile}>
            <FileUp className="mr-2 h-4 w-4" /> Send File
          </Button>
          {/* <Button variant="outline" onClick={onForward}>
                        <Forward className="mr-2 h-4 w-4" /> Forward
                    </Button> */}
        </div>
      </CardFooter>
    </Card>
  );
}
