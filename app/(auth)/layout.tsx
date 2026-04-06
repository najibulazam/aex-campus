/**
 * Auth layout — no Navbar, no Sidebar.
 * Renders a clean full-screen background for login/signup pages.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full">
      {children}
    </div>
  );
}
