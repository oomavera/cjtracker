export default function TermsOfService() {
  return (
    <main className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
        
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Thumbtack Integration Terms of Service</h2>
          
          <section className="mb-6">
            <h3 className="text-lg font-medium mb-2">Acceptance of Terms</h3>
            <p className="text-gray-600">
              By using this Thumbtack integration, you agree to these terms of service. 
              This is a personal automation tool for receiving Thumbtack notifications via Telegram.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-lg font-medium mb-2">Permitted Use</h3>
            <p className="text-gray-600">
              This integration is intended for personal use to receive notifications about your Thumbtack business. 
              You may not use this tool for commercial purposes or to resell services.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-lg font-medium mb-2">Limitations</h3>
            <p className="text-gray-600">
              This tool is provided as-is without warranty. The developer is not responsible for any 
              missed notifications or technical issues that may arise.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-lg font-medium mb-2">Compliance</h3>
            <p className="text-gray-600">
              Users are responsible for complying with Thumbtack's terms of service and any applicable 
              local laws and regulations.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-lg font-medium mb-2">Modifications</h3>
            <p className="text-gray-600">
              These terms may be updated at any time. Continued use of the integration constitutes 
              acceptance of any changes.
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
