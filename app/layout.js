import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en"><body className="bg-white text-black" style={{ fontFamily: '"Neue Haas Display", ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"' }}>{children}</body></html>
  );
}
