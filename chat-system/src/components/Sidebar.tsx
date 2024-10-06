import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "./ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { User } from "@/app/page";

interface SidebarProps {
  onlineUsers: User[];
}

export default function Sidebar({ onlineUsers }: SidebarProps) {
  return (
    <Card className="w-full md:w-1/3 lg:w-1/4">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Online onlineUsers</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <ul className="space-y-4">
            {onlineUsers.map((user) => {
              const username = user.username ?? user.id;
              return (
                <li
                  key={user.publicKey}
                  className="flex items-center space-x-4"
                >
                  <Avatar>
                    <AvatarImage
                      src={`https://api.dicebear.com/6.x/initials/svg?seed=${username}`}
                      alt={username}
                    />
                    <AvatarFallback>
                      {username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <HoverCard>
                    <HoverCardTrigger>
                      <Button variant="link">{username}</Button>
                    </HoverCardTrigger>
                    <HoverCardContent>
                      <p>Private message to {username}</p>
                    </HoverCardContent>
                  </HoverCard>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
