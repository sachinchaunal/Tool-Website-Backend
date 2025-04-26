const path = require('path');
const fs = require('fs');

// Controller for HTML to React conversion
exports.htmlToReact = async (req, res) => {
  try {
    const { htmlCode } = req.body;

    if (!htmlCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'HTML code is required' 
      });
    }

    // Basic HTML to React JSX conversion
    const reactCode = convertHtmlToReact(htmlCode);

    res.json({
      success: true,
      reactCode,
      message: 'HTML converted to React successfully'
    });
  } catch (error) {
    console.error('HTML to React conversion error:', error);
    res.status(500).json({
      success: false,
      message: 'Error converting HTML to React',
      error: error.message
    });
  }
};

function convertHtmlToReact(htmlCode) {
  // Enhanced HTML to React conversion logic
  let reactCode = htmlCode
    // Replace class attributes with className
    .replace(/class=/g, 'className=')
    // Replace for attributes with htmlFor
    .replace(/for=/g, 'htmlFor=')
    // Self-closing tags
    .replace(/<(img|input|br|hr|area|base|col|embed|link|meta|param|source|track)([^>]*)>/g, '<$1$2 />')
    // Handle inline styles
    .replace(/style="([^"]*)"/g, (match, styleString) => {
      // Convert CSS style string to React style object
      const styleObj = styleString.split(';')
        .filter(style => style.trim())
        .map(style => {
          let [property, value] = style.split(':').map(s => s.trim());
          // Convert CSS property to camelCase
          property = property.replace(/-([a-z])/g, g => g[1].toUpperCase());
          return `${property}: "${value}"`;
        });
      return `style={{${styleObj.join(', ')}}}`;
    })
    // Handle data attributes
    .replace(/data-([a-zA-Z0-9-]+)=/g, 'data$1=');

  // Wrap in a React component
  const reactComponent = `import React from 'react';\n\nconst Component = () => {\n  return (\n    ${reactCode}\n  );\n};\n\nexport default Component;`;
  
  return reactComponent;
}
