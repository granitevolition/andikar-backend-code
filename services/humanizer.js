const axios = require('axios');
const config = require('../config');

/**
 * Simple humanizing function
 * In a production system, this would call a more advanced NLP model
 */
const humanizeText = async (text, options = {}) => {
  const startTime = Date.now();
  
  try {
    // In a real system, this would call a specific AI model API
    // Here we're using a simulated approach that makes some simple transformations
    
    // Option 1: If we have a model API to call
    if (process.env.USE_EXTERNAL_API === 'true') {
      // Call external API
      const response = await axios.post('https://api.humanizer.example/v1/generate', {
        prompt: `Rewrite the following text to sound more natural and human-like, while preserving the meaning: ${text}`,
        model: options.model || config.HUMANIZER.DEFAULT_MODEL,
        temperature: options.temperature || config.HUMANIZER.TEMPERATURE,
        max_tokens: 2000
      }, {
        headers: {
          'Authorization': `Bearer ${config.HUMANIZER.API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      return {
        success: true,
        result: response.data.text,
        processingTime: Date.now() - startTime
      };
    }
    
    // Option 2: Simple rule-based transformations (fallback)
    let humanized = text;
    
    // Remove repetitive phrases
    const repetitiveExpressions = [
      { pattern: /\b(in conclusion|to conclude|to summarize|in summary)\b/gi, weight: 0.5 },
      { pattern: /\b(furthermore|moreover|additionally|in addition)\b/gi, weight: 0.6 },
      { pattern: /\b(thus|therefore|consequently|hence|as a result)\b/gi, weight: 0.7 }
    ];
    
    // Replace some formal phrases with more conversational ones
    const formalToConversational = [
      { pattern: /\butilize\b/g, replace: 'use' },
      { pattern: /\bcommence\b/g, replace: 'start' },
      { pattern: /\bterminate\b/g, replace: 'end' },
      { pattern: /\bobtain\b/g, replace: 'get' },
      { pattern: /\bundertake\b/g, replace: 'do' },
      { pattern: /\bpurchase\b/g, replace: 'buy' },
      { pattern: /\brequire\b/g, replace: 'need' },
      { pattern: /\bsubsequently\b/g, replace: 'later' },
      { pattern: /\bprior to\b/g, replace: 'before' },
      { pattern: /\bdue to the fact that\b/g, replace: 'because' },
      { pattern: /\bin the event that\b/g, replace: 'if' },
      { pattern: /\bfor the purpose of\b/g, replace: 'to' },
      { pattern: /\bin order to\b/g, replace: 'to' },
      { pattern: /\ba number of\b/g, replace: 'several' },
      { pattern: /\bthe majority of\b/g, replace: 'most' },
      { pattern: /\ba significant number of\b/g, replace: 'many' },
      { pattern: /\bat this point in time\b/g, replace: 'now' },
      { pattern: /\bin close proximity to\b/g, replace: 'near' }
    ];
    
    // Apply transformations
    for (const { pattern, replace } of formalToConversational) {
      humanized = humanized.replace(pattern, replace);
    }
    
    // Add some randomized sentence variations
    const sentences = humanized.split(/(?<=[.!?])\s+/);
    const humanizedSentences = sentences.map(sentence => {
      // Randomly modify some sentences
      if (Math.random() > 0.7) {
        // Add filler words occasionally
        const fillers = ["well, ", "you know, ", "I think ", "honestly, ", "basically, "];
        const selectedFiller = fillers[Math.floor(Math.random() * fillers.length)];
        
        if (Math.random() > 0.5 && sentence.length > 10) {
          return sentence.charAt(0).toUpperCase() + selectedFiller + sentence.charAt(0).toLowerCase() + sentence.slice(1);
        }
      }
      
      return sentence;
    });
    
    humanized = humanizedSentences.join(' ');
    
    // Randomly convert some periods to exclamation marks
    if (Math.random() > 0.7) {
      const parts = humanized.split('. ');
      if (parts.length > 3) {
        const index = Math.floor(Math.random() * (parts.length - 1)) + 1;
        parts[index - 1] = parts[index - 1] + '!';
        humanized = parts.join('. ');
      }
    }
    
    return {
      success: true,
      result: humanized,
      processingTime: Date.now() - startTime
    };
    
  } catch (error) {
    console.error('Error in humanizeText:', error);
    return {
      success: false,
      error: error.message || 'An error occurred during text humanization',
      processingTime: Date.now() - startTime
    };
  }
};

module.exports = {
  humanizeText
};
