interface SidebarProps {
    onlineUsers: string[];
}

export default function Sidebar({ onlineUsers }: SidebarProps) {
    return (
        <div className="w-1/4 bg-gray-100 p-4">
            <h2 className="text-xl font-bold mb-4">Online Users</h2>
            <ul>
                {onlineUsers.map((user) => (
                    <li key={user} className="mb-2">
                        {user}
                    </li>
                ))}
            </ul>
        </div>
    );
}