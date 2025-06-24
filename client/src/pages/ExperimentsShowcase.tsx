import React from 'react';

/**
 * ExperimentsShowcase - Isolated experiments showcase page
 * 
 * Contains all experimental features and design explorations.
 * This entire page can be safely deleted without affecting the main application.
 */
export function ExperimentsShowcase() {
  const experiments = [
    {
      title: "DaisyUI Pastel Theme - Dashboard",
      description: "Current vs DaisyUI dashboard comparison with track cards and navigation",
      link: "/experiments/01-dashboard-comparison.html",
      category: "UI Theme"
    },
    {
      title: "DaisyUI Pastel Theme - Chapter Editor",
      description: "Complete chapter editing interface with content tabs and audio mapping",
      link: "/experiments/02-chapter-editor-comparison.html",
      category: "UI Theme"
    },
    {
      title: "DaisyUI Pastel Theme - Forms",
      description: "Enhanced form components with validation states and file uploads",
      link: "/experiments/03-forms-comparison.html",
      category: "UI Theme"
    }
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🧪 Experiments Showcase</h1>
          <p className="text-gray-600">
            Isolated experiments and prototypes. These can be safely deleted without affecting the main application.
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

        {/* Experiments Grid */}
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {experiments.map((experiment, index) => (
            <div key={index} className="border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                    {experiment.category}
                  </span>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold mb-2">{experiment.title}</h3>
              <p className="text-gray-600 mb-4 text-sm">{experiment.description}</p>
              
              <div className="flex gap-2">
                <a 
                  href={experiment.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-1M14 6h6m0 0v6m0-6L10 16" />
                  </svg>
                  View Experiment
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* DaisyUI Theme Information */}
        <div className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-purple-900 mb-3">About DaisyUI Pastel Theme</h2>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-medium text-purple-800 mb-2">Visual Benefits:</h3>
              <ul className="text-purple-700 space-y-1">
                <li>• Soft pastel colors ideal for educational content</li>
                <li>• Better contrast for Telugu/Hindi scripts</li>
                <li>• Custom Vedic color extensions (saffron, gold)</li>
                <li>• Consistent spacing and typography</li>
                <li>• Professional academic appearance</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-purple-800 mb-2">Technical Benefits:</h3>
              <ul className="text-purple-700 space-y-1">
                <li>• Semantic class names (btn, card, badge)</li>
                <li>• Smaller CSS bundle size</li>
                <li>• Built-in responsive design</li>
                <li>• Easy theme customization</li>
                <li>• Unified design system</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Experiment Status */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">⚠️ Experimental Status</h3>
          <p className="text-yellow-800 text-sm">
            These are isolated experiments that don't affect the main application. 
            The entire experiments directory and this page can be safely deleted 
            without any impact on the production Vedic LMS functionality.
          </p>
        </div>



        {/* Debug Info */}
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Debug Info</h3>
          <p className="text-gray-700 text-sm">
            If experiments aren't working, try opening these direct URLs:
          </p>
          <ul className="text-sm text-gray-600 mt-2 space-y-1">
            <li>• http://localhost:5000/experiments/01-dashboard-comparison.html</li>
            <li>• http://localhost:5000/experiments/02-chapter-editor-comparison.html</li>
            <li>• http://localhost:5000/experiments/03-forms-comparison.html</li>
          </ul>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 text-center">
          <div className="space-x-4">
            <a 
              href="/experiments/01-dashboard-comparison.html" 
              target="_blank"
              className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Dashboard Example
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
    </div>
  );
}