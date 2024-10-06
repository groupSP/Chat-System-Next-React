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
import { Message } from "@/app/page";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatboxProps {
  // onForward: () => void;
  messages: Message[];
}

export default function Chatbox({ messages }: ChatboxProps) {
  const [message, setMessage] = useState("");
  const [recipient, setRecipient] = useState("group");

  const handleSendMessage = () => {
    console.log(`Sending message: ${message} to ${recipient}`);
    setMessage("");
  };

  const handleSendFile = () => {
    console.log("Sending file");
  };

  return (
    <Card className="w-full md:w-2/3 lg:w-3/4 flex flex-col">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-[calc(100vh-16rem)]">
          <div id="chat-messages" className="space-y-4 p-4">
            <ul>
              {messages.map((message) => (
                <li
                  key={message.content}
                  className="flex items-start space-x-4"
                >
                  <div className="flex-shrink-0">
                    <Avatar>
                      <AvatarImage
                        src={`https://api.dicebear.com/6.x/initials/svg?seed=${message.displayName()}`}
                        alt={message.displayName()}
                      />
                      <AvatarFallback>
                        {message.displayName().slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">
                        {message.displayName()}
                      </span>
                      {/* <span className="text-sm text-gray-500">
                        {message.timestamp}
                      </span> */}
                    </div>
                    <p className="text-sm">{message.content}</p>
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
              <SelectItem value="group">Group Chat</SelectItem>
              {/* Add other recipients here */}
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
