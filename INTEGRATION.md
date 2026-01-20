# Integration with www.idw3d.com

This guide covers integrating the quote system subdomain with your main website.

## Quick Start

The quote system is styled to match www.idw3d.com with:
- Dark theme (navy backgrounds)
- Cyan (#00d9ff) and amber (#ffb800) accents
- Syne and DM Mono fonts
- Matching button and card styles

## Adding Link from Main Site

### Option 1: Navigation Menu Link

Add to your main site's navigation in the header:

```html
<nav>
  <!-- Existing links -->
  <a href="/" class="nav-link">Home</a>
  <a href="#products" class="nav-link">Products</a>
  <a href="#about" class="nav-link">About</a>

  <!-- Add this -->
  <a href="https://quote.idw3d.com" class="nav-link nav-link-highlight">
    Get Quote
  </a>
</nav>
```

Suggested CSS for highlighted nav link:
```css
.nav-link-highlight {
  background: linear-gradient(135deg, #00d9ff 0%, #0099cc 100%);
  color: #0a0e12;
  padding: 0.5rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  transition: transform 0.2s ease;
}

.nav-link-highlight:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 20px rgba(0, 217, 255, 0.3);
}
```

### Option 2: Hero Section CTA Button

Update your hero section CTA:

```html
<section class="hero">
  <h1>Intelligent Design Works</h1>
  <p>Professional 3D Printing & Design Services</p>

  <!-- Update existing CTA or add new one -->
  <a href="https://quote.idw3d.com" class="cta-button">
    Get Instant Quote
  </a>
</section>
```

### Option 3: Dedicated Products Section Link

Add to each product card:

```html
<div class="product-card">
  <h3>3D Printing</h3>
  <p>High-quality 3D printing services...</p>

  <!-- Add this button -->
  <a href="https://quote.idw3d.com" class="btn-secondary">
    Get Quote
  </a>
</div>
```

### Option 4: Floating Action Button (FAB)

Add a persistent quote button:

```html
<!-- Add to body, before closing tag -->
<a href="https://quote.idw3d.com" class="fab-quote" aria-label="Get a quote">
  <svg><!-- Quote icon --></svg>
  Quote
</a>
```

```css
.fab-quote {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  background: linear-gradient(135deg, #00d9ff 0%, #0099cc 100%);
  color: #0a0e12;
  padding: 1rem 1.5rem;
  border-radius: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  font-family: 'Syne', sans-serif;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  z-index: 1000;
  transition: all 0.3s ease;
}

.fab-quote:hover {
  transform: translateY(-4px);
  box-shadow: 0 0 30px rgba(0, 217, 255, 0.5);
}
```

## Analytics Tracking (Optional)

Track quote button clicks:

```javascript
// Google Analytics 4
document.querySelectorAll('a[href*="quote.idw3d.com"]').forEach(link => {
  link.addEventListener('click', () => {
    gtag('event', 'quote_click', {
      'event_category': 'engagement',
      'event_label': 'Quote System Link'
    });
  });
});

// Or for GA4 events
gtag('event', 'click', {
  'event_category': 'outbound',
  'event_label': 'quote_system',
  'value': 1
});
```

## Cross-Domain Session (Optional)

To maintain user context between domains:

### On Main Site (www.idw3d.com)

```javascript
// Pass user info via URL parameters
function openQuote() {
  const params = new URLSearchParams({
    source: 'main_site',
    ref: window.location.pathname,
    // Optional: pass pre-filled info
    // email: userEmail (if known)
  });

  window.location.href = `https://quote.idw3d.com?${params}`;
}
```

### On Quote Site (quote.idw3d.com)

Already configured to handle URL parameters for pre-filling forms.

## Embed Option (Alternative)

If you prefer embedding instead of subdomain:

```html
<!-- Add to main site page -->
<div class="quote-embed-container">
  <iframe
    src="https://quote.idw3d.com"
    width="100%"
    height="800px"
    frameborder="0"
    title="3D Print Quote System"
    allow="clipboard-write"
  ></iframe>
</div>
```

**Note:** Subdomain approach is recommended over iframe for better:
- SEO
- Performance
- User experience
- Mobile responsiveness

## Testing Integration

1. Deploy quote system to `quote.idw3d.com`
2. Add link to main site
3. Test navigation flow:
   - Click from main site → arrives at quote system
   - Verify styling consistency
   - Test on mobile devices
   - Check load times

## Example: Complete Header Integration

```html
<header class="site-header">
  <div class="container">
    <div class="header-content">
      <!-- Logo -->
      <a href="/" class="logo">
        <img src="/logo.svg" alt="IDW3D">
        <span>Intelligent Design Works</span>
      </a>

      <!-- Navigation -->
      <nav class="main-nav">
        <a href="/#products">Products</a>
        <a href="/#about">About</a>
        <a href="/#contact">Contact</a>

        <!-- Quote CTA -->
        <a href="https://quote.idw3d.com" class="btn-quote">
          Get Quote
        </a>
      </nav>
    </div>
  </div>
</header>
```

## Styling Consistency Checklist

- [x] Matching color palette (dark navy, cyan, amber)
- [x] Same fonts (Syne for headings, DM Mono for body)
- [x] Consistent button styles
- [x] Similar card/container styles
- [x] Matching input/form styles
- [x] Same hover effects and transitions

## Support

For questions about integration:
1. Check DEPLOYMENT.md for technical setup
2. Review styling in src/app/idw-theme.css
3. Test in staging before production deployment
