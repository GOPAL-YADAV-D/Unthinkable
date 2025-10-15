const llmService = require('../services/llmService');
const logger = require('../utils/logger');

class LLMController {
  // Generate subtasks for a goal
  async generateSubtasks(req, res) {
    try {
      const result = await llmService.generateSubtasks(req.body);
      
      res.status(200).json({
        success: true,
        message: 'Subtasks generated successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Generate subtasks controller error:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Optimize goal title
  async optimizeTitle(req, res) {
    try {
      const result = await llmService.optimizeTitle(req.body);
      
      res.status(200).json({
        success: true,
        message: 'Title optimized successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Optimize title controller error:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Interactive chat for goal planning
  async chat(req, res) {
    try {
      const { messages, goalContext } = req.body;
      
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Messages array is required',
        });
      }

      // For now, provide a simple response
      // This can be expanded to use the LLM for conversational planning
      const lastMessage = messages[messages.length - 1];
      
      let response = {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      };

      // Simple keyword-based responses for development
      const userMessage = lastMessage.content.toLowerCase();
      
      if (userMessage.includes('help') || userMessage.includes('stuck')) {
        response.content = `I can help you break down your goal into manageable tasks! Here are some ways I can assist:

1. **Generate Subtasks**: I can analyze your goal and create a detailed action plan
2. **Optimize Titles**: Make your goal titles more clear and motivating  
3. **Provide Guidance**: Offer tips and best practices for goal completion

What specific aspect of your goal would you like help with?`;
      } else if (userMessage.includes('subtask') || userMessage.includes('task') || userMessage.includes('break down')) {
        response.content = `Great! I can help you break down your goal into actionable subtasks. To generate the best recommendations, please provide:

- Your main goal description
- Timeline or deadline
- Available resources/team size
- Your experience level with similar goals

Use the "Generate Subtasks" feature for a comprehensive breakdown!`;
      } else if (userMessage.includes('title') || userMessage.includes('name')) {
        response.content = `I can help optimize your goal title to make it more clear, actionable, and motivating. A good goal title should be:

- Specific and clear
- Action-oriented  
- Inspiring but realistic
- Easy to remember

Try the "Optimize Title" feature to get suggestions!`;
      } else {
        response.content = `I understand you're working on: "${lastMessage.content}"

I'm here to help you plan and achieve your goals! I can:
- Break down complex goals into manageable subtasks
- Suggest optimized titles for better clarity
- Provide planning guidance and tips

What would you like help with first?`;
      }

      res.status(200).json({
        success: true,
        data: {
          response,
          suggestions: [
            'Generate subtasks for this goal',
            'Optimize the goal title',
            'Get planning tips',
            'Estimate timeline',
          ],
        },
      });
    } catch (error) {
      logger.error('Chat controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Chat processing failed',
      });
    }
  }

  // Suggest priority level for a goal
  async suggestPriority(req, res) {
    try {
      const { goalDescription, context = {} } = req.body;
      
      if (!goalDescription) {
        return res.status(400).json({
          success: false,
          error: 'Goal description is required',
        });
      }

      // Simple priority suggestion based on keywords
      const description = goalDescription.toLowerCase();
      let priority = 'MEDIUM';
      let reasoning = 'Standard priority assigned';

      // High priority indicators
      if (description.includes('urgent') || 
          description.includes('deadline') || 
          description.includes('critical') ||
          description.includes('asap') ||
          description.includes('emergency')) {
        priority = 'HIGH';
        reasoning = 'Contains urgency indicators';
      }
      // Low priority indicators
      else if (description.includes('someday') || 
               description.includes('eventually') || 
               description.includes('nice to have') ||
               description.includes('future')) {
        priority = 'LOW';
        reasoning = 'Contains low-urgency indicators';
      }
      // Medium priority (default)
      else {
        reasoning = 'No specific urgency indicators found, assigned medium priority';
      }

      res.status(200).json({
        success: true,
        data: {
          suggestedPriority: priority,
          reasoning,
          alternatives: [
            { priority: 'HIGH', reason: 'If this goal has urgent business impact' },
            { priority: 'MEDIUM', reason: 'For regular planned work' },
            { priority: 'LOW', reason: 'For future considerations or nice-to-have features' },
          ],
        },
      });
    } catch (error) {
      logger.error('Suggest priority controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Priority suggestion failed',
      });
    }
  }

  // Estimate completion time for a goal
  async estimateTime(req, res) {
    try {
      const { goalDescription, subtasks = [], context = {} } = req.body;
      
      if (!goalDescription) {
        return res.status(400).json({
          success: false,
          error: 'Goal description is required',
        });
      }

      const { teamSize = 1, skillLevel = 'intermediate' } = context;

      // Calculate time estimate
      let baseHours = 8; // Default estimate
      
      // Adjust based on complexity indicators
      const description = goalDescription.toLowerCase();
      if (description.includes('complex') || description.includes('advanced') || description.includes('comprehensive')) {
        baseHours *= 2;
      } else if (description.includes('simple') || description.includes('quick') || description.includes('basic')) {
        baseHours *= 0.5;
      }

      // If subtasks are provided, use their estimates
      if (subtasks.length > 0) {
        const subtaskHours = subtasks.reduce((total, task) => {
          return total + (task.estimatedHours || 2);
        }, 0);
        baseHours = subtaskHours;
      }

      // Adjust for team size
      const teamAdjustedHours = Math.max(baseHours / teamSize, 2);

      // Adjust for skill level
      const skillMultiplier = {
        beginner: 1.5,
        intermediate: 1.0,
        advanced: 0.8,
      };
      
      const finalHours = Math.round(teamAdjustedHours * (skillMultiplier[skillLevel] || 1.0));
      
      // Convert to days (assuming 8 hours per day)
      const days = Math.ceil(finalHours / 8);
      
      res.status(200).json({
        success: true,
        data: {
          estimatedHours: finalHours,
          estimatedDays: days,
          breakdown: {
            baseEstimate: baseHours,
            teamAdjustment: teamAdjustedHours,
            skillAdjustment: finalHours,
          },
          factors: {
            teamSize,
            skillLevel,
            complexity: description.includes('complex') ? 'high' : description.includes('simple') ? 'low' : 'medium',
          },
          recommendations: [
            'Add 20-30% buffer time for unexpected challenges',
            'Consider breaking down large tasks into smaller chunks',
            'Plan regular check-ins to track progress',
          ],
        },
      });
    } catch (error) {
      logger.error('Estimate time controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Time estimation failed',
      });
    }
  }

  // Get LLM service status
  async getStatus(req, res) {
    try {
      const status = llmService.getStatus();
      
      res.status(200).json({
        success: true,
        data: {
          status,
          capabilities: [
            'Subtask generation',
            'Title optimization', 
            'Priority suggestions',
            'Time estimation',
            'Interactive chat',
          ],
          models: {
            primary: status.gemini?.available ? 'Google Gemini Pro' : 'Fallback Algorithm',
            fallback: 'Rule-based generation',
          },
        },
      });
    } catch (error) {
      logger.error('Get LLM status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get LLM status',
      });
    }
  }
}

module.exports = new LLMController();