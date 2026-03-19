import Sidebar from "./Sidebar";
import Header from "./Header";
import { useState, useEffect } from "react";

function Layout({ children }) {
  const [open, setOpen] = useState(true);

  // Handle initial load AND window resizing dynamically
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setOpen(false); // Close on mobile/tablet
      } else {
        setOpen(true);  // Auto-open on large desktop screens
      }
    };

    // Run once on mount
    handleResize();

    // Listen for screen size changes (like rotating a tablet or resizing a window)
    window.addEventListener("resize", handleResize);

    // Cleanup the listener when component unmounts
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-hidden">

      {/* Mobile overlay — click karo sidebar band ho */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden transition-opacity"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      {/* Note: I kept your width logic but ensured it doesn't break UI during transitions */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-40
        ${open ? "w-64" : "w-0 lg:w-20"}
        transition-all duration-300 overflow-hidden shrink-0
      `}>
        <Sidebar open={open} setOpen={setOpen} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen transition-all duration-300">
        {/* Passed open & setOpen to Header so you can add a Hamburger Menu button! */}
        <Header open={open} setOpen={setOpen} />
        
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

    </div>
  );
}

export default Layout;