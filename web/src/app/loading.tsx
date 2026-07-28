export default function Loading() {
  return (
    <div className="min-h-screen mesh-gradient flex items-center justify-center">
      <div className="text-center">
        {/* Logo */}
        <div className="mb-6">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto animate-pulse">
            <div className="w-10 h-10 rounded-xl bg-[#E8231A]/50" />
          </div>
        </div>

        {/* Loading text */}
        <p className="text-white/60 text-sm font-medium">Loading...</p>

        {/* Simple spinner */}
        <div className="mt-4 flex justify-center">
          <div className="w-6 h-6 border-2 border-white/20 border-t-[#E8231A] rounded-full animate-spin" />
        </div>
      </div>
    </div>
  );
}
