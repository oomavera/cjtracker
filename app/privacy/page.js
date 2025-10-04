export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Thumbtack Integration Privacy Policy</h2>
          
          <section className="mb-6">
            <h3 className="text-lg font-medium mb-2">Data Collection</h3>
            <p className="text-gray-600">
              This integration collects only the data necessary to forward Thumbtack notifications to your personal Telegram bot. 
              No personal data is stored or shared with third parties.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-lg font-medium mb-2">Data Usage</h3>
            <p className="text-gray-600">
              Your Thumbtack lead and message data is only used to send notifications to your Telegram account. 
              The data is processed in real-time and not stored permanently.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-lg font-medium mb-2">Data Security</h3>
            <p className="text-gray-600">
              All data transmission is secured using HTTPS. Your Telegram bot token and chat ID are stored securely 
              as environment variables and are never exposed in the application code.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-lg font-medium mb-2">Contact</h3>
            <p className="text-gray-600">
              For questions about this privacy policy, please contact the application owner.
            </p>
          </section>

          <p className="text-sm text-gray-500 mt-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </main>
  );
}
