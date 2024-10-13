This code is written by:
Ashley Chen (a1868108)
Yihui He (a1810178)
Jiawei Hu (a1859543)
Jessica Xia (a1867906)

The source code is on github: https://github.com/groupSP/Chat-System-Next-React


This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, install the dependancy: ```npm i```.
Second, go to the path that contain package.json ```cd chat-system```.
Third, go to websocket_server folder, you can go by typing: ```cd src\websocket_server```.
Then, run the server before running the client webpage: ```node server.js```
Finally, open another terminal in the path that contain package.json and run:
```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the result.

## Learn More

Functions:
User list: show all online users.

Send messages: You can type your message and click “Send”. The message will be encrypted using AES and sent to the server.

Upload files: Click the “Choose file” button, select a file and click “Send File”. Then the file will be encrypted and transferred.

## Auto generated ↓

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

