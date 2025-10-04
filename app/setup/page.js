"use client";

import TelegramSetup from '../components/TelegramSetup';

export default function SetupPage() {
  return (
    <main className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Thumbtack → Telegram Integration Setup
        </h1>
        <TelegramSetup />
      </div>
    </main>
  );
}
