
const path = require('path');
const testPath = path.join(__dirname, 'generated/great-gatsby/cover.jpg');

(async () => {
  try {
    // Simulate Sharp.js failure
    const originalImport = require;
    require = function(name) {
      if (name === 'sharp') {
        throw new Error('Sharp.js not available for test');
      }
      return originalImport.apply(this, arguments);
    };
    
    const { createImageProcessor } = require('./packages/@brainrot/converter/dist/index.js');
    const processor = await createImageProcessor();
    console.log('✅ Fallback processor created:', processor.getName());
    
    const metadata = await processor.getMetadata(testPath);
    console.log('✅ Metadata retrieved:', metadata);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
