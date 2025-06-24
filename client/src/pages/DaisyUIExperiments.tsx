import React from 'react';

/**
 * DaisyUIExperiments - Showcase page for DaisyUI migration examples
 * 
 * Provides easy access to HTML experiment files for evaluating
 * the DaisyUI pastel theme integration with Vedic LMS components.
 */
export function DaisyUIExperiments() {
  const examples = [
    {
      title: "Dashboard Comparison",
      description: "Current vs DaisyUI dashboard, track cards, navigation",
      file: "01-dashboard-comparison.html"
    },
    {
      title: "Chapter Editor Interface", 
      description: "Content tabs, audio mapping, text segmentation",
      file: "02-chapter-editor-comparison.html"
    },
    {
      title: "Forms & Input Components",
      description: "Track creation, chapter forms, validation states",
      file: "03-forms-comparison.html"
    }
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">DaisyUI Migration Experiments</h1>
        <p className="text-gray-600 mb-8">
          Explore how Vedic LMS components would look with DaisyUI pastel theme.
          These are isolated examples that don't affect the real application.
        </p>

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
          {examples.map((example, index) => (
            <div key={index} className="border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xl font-semibold mb-2">{example.title}</h3>
              <p className="text-gray-600 mb-4">{example.description}</p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <a 
                  href={`/experiments/${example.file}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-1M14 6h6m0 0v6m0-6L10 16" />
                  </svg>
                  Open Example
                </a>
                
                <a 
                  href={`/experiments/${example.file}`}
                  download
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download HTML
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">About These Experiments</h3>
          <ul className="text-blue-800 space-y-1 text-sm">
            <li>• These are standalone HTML files with DaisyUI and pastel theme applied</li>
            <li>• They show exact component transformations from current style to DaisyUI</li>
            <li>• Include custom Vedic color extensions (saffron, gold)</li>
            <li>• Safe to explore - won't affect your real application</li>
            <li>• Can be safely deleted after evaluation</li>
          </ul>
        </div>

        <div className="mt-6 bg-orange-50 border border-orange-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-orange-900 mb-2">Custom Vedic Theme Features</h3>
          <div className="grid md:grid-cols-2 gap-4 text-orange-800 text-sm">
            <div>
              <h4 className="font-medium mb-1">Visual Enhancements:</h4>
              <ul className="space-y-1">
                <li>• Soft pastel colors for peaceful learning</li>
                <li>• Better contrast for Telugu/Hindi scripts</li>
                <li>• Sacred symbols integrated naturally</li>
                <li>• Cultural color palette</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-1">Technical Benefits:</h4>
              <ul className="space-y-1">
                <li>• Smaller CSS bundle size</li>
                <li>• Semantic class names</li>
                <li>• Built-in responsive design</li>
                <li>• Easy theme customization</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}