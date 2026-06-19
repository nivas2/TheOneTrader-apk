import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Desktop: 4-column grid */}
        <div className="hidden md:grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white text-lg font-bold mb-4">TheOneTrade</h3>
            <p className="text-sm">
              Expert-curated trading signals for Indian stock markets. Intraday, F&O, MTF, and more.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/login" className="hover:text-white transition-colors">Login</Link></li>
              <li><Link href="/register" className="hover:text-white transition-colors">Register</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Contact & Support</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="mailto:hari@theonetrade.in" className="hover:text-white transition-colors">
                  hari@theonetrade.in
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Disclaimer</h4>
            <p className="text-xs">
              Trading in financial markets involves substantial risk. Past performance is not indicative of future results.
              The information provided is for educational purposes only and should not be considered as financial advice.
              Please consult with a qualified financial advisor before making any investment decisions.
            </p>
          </div>
        </div>

        {/* Mobile: Logo → Links + Contact (side-by-side) → Disclaimer (full width) */}
        <div className="md:hidden space-y-6">
          <div>
            <h3 className="text-white text-lg font-bold mb-2">TheOneTrade</h3>
            <p className="text-sm">
              Expert-curated trading signals for Indian stock markets. Intraday, F&O, MTF, and more.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-white font-semibold mb-3">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/login" className="hover:text-white transition-colors">Login</Link></li>
                <li><Link href="/register" className="hover:text-white transition-colors">Register</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Contact & Support</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="mailto:hari@theonetrade.in" className="hover:text-white transition-colors">
                    hari@theonetrade.in
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-2">Disclaimer</h4>
            <p className="text-xs">
              Trading in financial markets involves substantial risk. Past performance is not indicative of future results.
              The information provided is for educational purposes only and should not be considered as financial advice.
              Please consult with a qualified financial advisor before making any investment decisions.
            </p>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} TheOneTrade. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
