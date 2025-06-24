import React from 'react';

/**
 * DaisyUI5Showcase - DaisyUI latest version experiments showcase
 * 
 * Isolated experiments with DaisyUI 4.12.24 to evaluate aesthetics
 * and theme options for Vedic LMS. Complete isolation from main app.
 */
export function DaisyUI5Showcase() {
  const experiments = [
    {
      title: "Theme Comparison",
      description: "Interactive comparison of 12 DaisyUI themes including Bootstrap-style variants (corporate, wireframe), light/dark modes, and professional themes",
      link: "/experiments/01-theme-comparison.html",
      highlight: "Interactive theme switcher"
    },
    {
      title: "Night + Business Pairing",
      description: "Perfect light/dark mode combination - Night theme as dark mode with Business theme as complementary light mode",
      link: "/experiments/03-night-business-pairing.html",
      highlight: "Perfect theme pair"
    },
    {
      title: "FlatUI / Bootflat Colors",
      description: "Custom DaisyUI themes with vibrant FlatUI and Bootflat color schemes - beautiful flat design button palettes",
      link: "/experiments/04-flatui-bootflat-style.html",
      highlight: "Flat design colors"
    },
    {
      title: "Bootflat Focused Design",
      description: "Pure Bootflat color scheme with official turquoise (#1abc9c), blue (#3498db), and orange (#f39c12) from bootflat.github.io",
      link: "/experiments/05-bootflat-focused.html",
      highlight: "Official Bootflat colors"
    },
    {
      title: "Bootflat Light Inspired",
      description: "Soft, elegant light theme inspired by Bootflat with gentle colors (#74b9ff, #81ecec, #fdcb6e) perfect for extended reading",
      link: "/experiments/06-bootflat-light-inspired.html",
      highlight: "Gentle colors"
    },
    {
      title: "True Bootflat Light",
      description: "Pure white background light theme with Bootflat-inspired button colors - clean and readable for Vedic content",
      link: "/experiments/07-true-bootflat-light.html",
      highlight: "True light theme"
    },
    {
      title: "Bootstrap 5 Inspired",
      description: "Professional design based on Bootstrap 5 color system with subtle, accessible colors (#0d6efd, #6c757d, #198754)",
      link: "/experiments/08-bootstrap5-inspired.html",
      highlight: "Bootstrap 5 design"
    },
    {
      title: "Bootstrap 5 Full Integration",
      description: "Complete Bootstrap 5 implementation with native components, dark/light themes, and professional design system",
      link: "/experiments/bootstrap5-integration/bootstrap5-vedic-prototype.html",
      highlight: "Full Bootstrap 5"
    },
    {
      title: "Vedic Dashboard",
      description: "Complete dashboard redesign with autumn theme and Vedic aesthetic enhancements",
      link: "/experiments/02-vedic-dashboard.html",
      highlight: "Vedic-inspired design"
    }
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">DaisyUI Latest Experiments</h1>
          <p className="text-gray-600">
            Exploring DaisyUI 4.12.24 with modern aesthetics and theme options for Vedic LMS
          </p>
        </div>

        {/* Back Navigation */}
        <div className="mb-6">
          <a 
            href="/" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            ← Back to Dashboard
          </a>
        </div>

        {/* Version Comparison Info */}
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-3">DaisyUI 4.12.24 Features</h2>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-medium text-blue-800 mb-2">Visual Enhancements:</h3>
              <ul className="text-blue-700 space-y-1">
                <li>• Refreshed color palettes with better harmony</li>
                <li>• Improved typography and spacing</li>
                <li>• Enhanced component aesthetics</li>
                <li>• Better shadow and border styling</li>
                <li>• More polished theme implementations</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-blue-800 mb-2">New Features:</h3>
              <ul className="text-blue-700 space-y-1">
                <li>• Better theme customization options</li>
                <li>• Improved component consistency</li>
                <li>• Enhanced accessibility features</li>
                <li>• Better font integration support</li>
                <li>• More semantic color meanings</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Experiments Grid */}
        <div className="grid gap-8">
          {experiments.map((experiment, index) => (
            <div key={index} className="border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="inline-block px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full mb-2">
                    DaisyUI 4.12.24
                  </span>
                  {experiment.highlight && (
                    <span className="inline-block px-3 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full mb-2 ml-2">
                      {experiment.highlight}
                    </span>
                  )}
                </div>
              </div>
              
              <h3 className="text-xl font-semibold mb-3">{experiment.title}</h3>
              <p className="text-gray-600 mb-4">{experiment.description}</p>
              
              <div className="flex gap-3">
                <a 
                  href={experiment.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-1M14 6h6m0 0v6m0-6L10 16" />
                  </svg>
                  Open Experiment
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Night Theme Light Equivalents */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-3">Night Theme Light Equivalents</h2>
          <p className="text-blue-800 mb-4">Since you like the Night theme, here are light themes with similar elegance and sophistication:</p>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white p-4 rounded border">
              <h3 className="font-medium text-blue-800 mb-2">Business Theme</h3>
              <p className="text-blue-700">Clean, professional light theme with similar contrast and readability to Night.</p>
            </div>
            <div className="bg-white p-4 rounded border">
              <h3 className="font-medium text-blue-800 mb-2">Luxury Theme</h3>
              <p className="text-blue-700">Sophisticated light theme with refined elegance matching Night's premium feel.</p>
            </div>
            <div className="bg-white p-4 rounded border">
              <h3 className="font-medium text-blue-800 mb-2">CMYK Theme</h3>
              <p className="text-blue-700">High contrast light theme with crisp, modern aesthetics similar to Night's clarity.</p>
            </div>
          </div>
        </div>

        {/* Theme Recommendations */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-amber-900 mb-3">Recommended Themes for Vedic LMS</h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white p-4 rounded border">
              <h3 className="font-medium text-amber-800 mb-2">Night + Business</h3>
              <p className="text-amber-700">Dark/light mode pair with elegant, professional aesthetics for focused learning.</p>
            </div>
            <div className="bg-white p-4 rounded border">
              <h3 className="font-medium text-amber-800 mb-2">Autumn Theme</h3>
              <p className="text-amber-700">Warm oranges and browns that complement traditional Vedic colors like saffron and gold.</p>
            </div>
            <div className="bg-white p-4 rounded border">
              <h3 className="font-medium text-amber-800 mb-2">Forest Theme</h3>
              <p className="text-amber-700">Natural earth tones that reflect the connection to nature in Vedic traditions.</p>
            </div>
          </div>
        </div>

        {/* Direct Access Links */}
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Direct Access URLs</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Theme Comparison: <code className="bg-gray-200 px-2 py-1 rounded text-xs">http://localhost:5000/experiments/01-theme-comparison.html</code></li>
            <li>• Vedic Dashboard: <code className="bg-gray-200 px-2 py-1 rounded text-xs">http://localhost:5000/experiments/02-vedic-dashboard.html</code></li>
          </ul>
        </div>

        {/* Experiment Status */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">⚠️ Experimental Status</h3>
          <p className="text-yellow-800 text-sm">
            These experiments are completely isolated and don't affect the main application. 
            The entire experiments directory can be safely deleted without any impact on production functionality.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 text-center space-x-4">
          <a 
            href="/experiments/01-theme-comparison.html" 
            target="_blank"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Quick Start - Theme Comparison
          </a>
          <a 
            href="/" 
            className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Return to Main App
          </a>
        </div>
      </div>
    </div>
  );
}