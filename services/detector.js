const axios = require('axios');
const config = require('../config');

/**
 * Simple AI content detection function
 * In a production system, this would use a specialized detection model or API
 */
const detectAIContent = async (text, user = null) => {
  const startTime = Date.now();
  
  try {
    // Option 1: Use external API for detection if configured
    // This would use API keys stored in the user account, if available
    if (user && user.apiKeys && (user.apiKeys.gptZero || user.apiKeys.originality)) {
      // Use GPTZero API if available
      if (user.apiKeys.gptZero) {
        try {
          const response = await axios.post('https://api.gptzero.me/v1/predict', {
            document: text
          }, {
            headers: {
              'X-API-Key': user.apiKeys.gptZero,
              'Content-Type': 'application/json'
            }
          });
          
          return {
            success: true,
            source: 'gptzero',
            result: {
              ai_score: response.data.details.overall_humangenerated ? 100 - response.data.details.overall_probability : response.data.details.overall_probability,
              human_score: response.data.details.overall_humangenerated ? response.data.details.overall_probability : 100 - response.data.details.overall_probability,
              analysis: response.data.details
            },
            processingTime: Date.now() - startTime
          };
        } catch (error) {
          console.error('GPTZero API error:', error.message);
          // Fall back to local detection
        }
      }
      
      // Use Originality API if available and GPTZero failed
      if (user.apiKeys.originality) {
        try {
          const response = await axios.post('https://api.originality.ai/api/v1/scan', {
            content: text
          }, {
            headers: {
              'X-OAI-Key': user.apiKeys.originality,
              'Content-Type': 'application/json'
            }
          });
          
          return {
            success: true,
            source: 'originality',
            result: {
              ai_score: response.data.ai_score * 100,
              human_score: (1 - response.data.ai_score) * 100,
              analysis: response.data
            },
            processingTime: Date.now() - startTime
          };
        } catch (error) {
          console.error('Originality API error:', error.message);
          // Fall back to local detection
        }
      }
    }
    
    // Option 2: Use local detection algorithm as fallback
    
    // Detection heuristics - looking for patterns common in AI text
    const aiIndicators = [
      "furthermore,", "additionally,", "moreover,", "thus,", "therefore,",
      "consequently,", "hence,", "as a result,", "in conclusion,",
      "to summarize,", "in summary,"
    ];

    // Count indicators
    const indicatorCount = aiIndicators.reduce((count, indicator) => {
      return count + (text.toLowerCase().match(new RegExp('\\b' + indicator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g')) || []).length;
    }, 0);

    // Check for repetitive phrases
    const sentences = text.split(/(?<=[.!?])\s+/);
    const sentenceStarts = sentences
      .filter(s => s.trim() !== '')
      .map(sentence => {
        const words = sentence.trim().split(/\s+/);
        return words.length > 0 ? words[0].toLowerCase() : '';
      });
    
    const uniqueStarts = new Set(sentenceStarts);
    const repeatedStarts = sentenceStarts.length - uniqueStarts.size;

    // Calculate uniformity of sentence length
    const sentenceLengths = sentences
      .filter(s => s.trim() !== '')
      .map(s => s.length);
    
    const meanLength = sentenceLengths.reduce((sum, len) => sum + len, 0) / sentenceLengths.length;
    const variance = sentenceLengths.reduce((sum, len) => sum + Math.pow(len - meanLength, 2), 0) / sentenceLengths.length;
    const stdDev = Math.sqrt(variance);
    const lengthUniformity = meanLength > 0 ? stdDev / meanLength : 0;

    // Calculate AI likelihood score (0-100)
    const baseScore = Math.min(100, (indicatorCount * 10) + (repeatedStarts * 5) + (100 - lengthUniformity * 100));
    const randomizer = 0.85 + Math.random() * 0.3; // Add some randomness
    const aiScore = Math.min(100, Math.max(0, baseScore * randomizer));

    return {
      success: true,
      source: 'local',
      result: {
        ai_score: Math.round(aiScore * 10) / 10,
        human_score: Math.round((100 - aiScore) * 10) / 10,
        analysis: {
          formal_language: Math.min(100, indicatorCount * 15),
          repetitive_patterns: Math.min(100, repeatedStarts * 20),
          sentence_uniformity: Math.min(100, (1 - lengthUniformity) * 100)
        }
      },
      processingTime: Date.now() - startTime
    };
    
  } catch (error) {
    console.error('Error in detectAIContent:', error);
    return {
      success: false,
      error: error.message || 'An error occurred during content analysis',
      processingTime: Date.now() - startTime
    };
  }
};

module.exports = {
  detectAIContent
};
