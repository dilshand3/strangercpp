import type { Metadata } from "next";
import { SocketProvider } from "@/context/SocketContext";
import "@/app/page.module.css"

export const metadata: Metadata = {
  title: "Stranger.cpp",
  description: "If you are stranger then talk to random people and become an extrovert",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
        href="https://fonts.googleapis.com/icon?family=Material+Icons"
        rel="stylesheet"
      />
      </head>
      <body >
        <SocketProvider>
          {children}
        </SocketProvider>
      </body>
    </html>
  );
}
