import { useState } from 'react';

interface LoginContainerProps {
    onLogin: (username: string) => void;
}

export default function LoginContainer({ onLogin }: LoginContainerProps) {
    const [username, setUsername] = useState('');

    const handleLogin = () => {
        if (username.trim()) {
            onLogin(username);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your name"
                className="p-2 border rounded mb-2"
            />
            <button onClick={handleLogin} className="p-2 bg-blue-500 text-white rounded">
                Login
            </button>
        </div>
    );
}