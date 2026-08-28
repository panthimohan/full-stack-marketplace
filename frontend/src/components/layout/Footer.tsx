export function Footer() {
  return (
    <footer className="border-t border-line mt-16 bg-surface">
      <div className="container-page py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="font-display font-bold text-ink-900 mb-2">Marketto</div>
          <p className="text-ink-700/70">A marketplace connecting independent vendors with customers, all in one storefront.</p>
        </div>
        <div>
          <div className="font-semibold mb-2 text-ink-900">Shop</div>
          <ul className="space-y-1.5 text-ink-700/70">
            <li>All products</li>
            <li>Vendors</li>
            <li>Categories</li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-2 text-ink-900">Sell</div>
          <ul className="space-y-1.5 text-ink-700/70">
            <li>Become a vendor</li>
            <li>Vendor dashboard</li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-2 text-ink-900">Support</div>
          <ul className="space-y-1.5 text-ink-700/70">
            <li>Cash on Delivery</li>
            <li>eSewa Payments</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-ink-700/50">
        Capstone project — built for demonstration purposes.
      </div>
    </footer>
  );
}
