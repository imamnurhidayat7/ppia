"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie } from "lucide-react";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has already accepted
    const accepted = localStorage.getItem("ppia-cookie-consent");
    if (!accepted) {
      // Show after a short delay
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("ppia-cookie-consent", "accepted");
    setVisible(false);
    setDismissed(true);
  };

  const decline = () => {
    localStorage.setItem("ppia-cookie-consent", "declined");
    setVisible(false);
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-[#0D1B33] border-t border-white/10"
        >
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#E8231A]/20 flex items-center justify-center shrink-0">
                <Cookie size={20} className="text-[#E8231A]" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">We use cookies</h3>
                <p className="text-[#94A3B8] text-sm">
                  We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={decline}
                className="px-4 py-2 text-[#94A3B8] hover:text-white text-sm font-medium transition-colors"
              >
                Decline
              </button>
              <button
                onClick={accept}
                className="px-6 py-2 bg-[#E8231A] hover:bg-[#C41E16] text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Accept
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
