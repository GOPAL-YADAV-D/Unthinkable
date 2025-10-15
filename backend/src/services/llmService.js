const { GoogleGenerativeAI } = require('@google/generative-ai');
const { z } = require('zod');
const config = require('../config');
const logger = require('../utils/logger');

// Validation schemas
const generateSubtasksSchema = z.object({
  goalDescription: z.string().min(1, 'Goal description is required'),
  context: z.object({
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
    dueDate: z.string().optional(),
    project: z.string().optional(),
    teamSize: z.number().min(1).max(20).optional(),
    skillLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    budget: z.enum(['low', 'medium', 'high', 'unlimited']).optional(),
    complexity: z.enum(['simple', 'moderate', 'complex']).optional(),
  }).optional(),
});

const optimizeTitleSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  context: z.object({
    maxLength: z.number().min(10).max(100).optional(),
    tone: z.enum(['professional', 'casual', 'motivational', 'technical']).optional(),
  }).optional(),
});

class LLMService {
  constructor() {
    this.gemini = null;
    this.geminiModel = null;
    this.isGeminiAvailable = false;
    
    // Initialize Google Gemini client if API key is available
    if (config.llm.geminiApiKey && !config.llm.geminiApiKey.includes('your-gemini-api-key')) {
      try {
        this.gemini = new GoogleGenerativeAI(config.llm.geminiApiKey);
        this.geminiModel = this.gemini.getGenerativeModel({ model: 'gemini-pro' });
        this.isGeminiAvailable = true;
        logger.info('Google Gemini client initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize Gemini client:', error);
      }
    } else {
      logger.warn('Gemini API key not configured, using fallback responses');
    }
  }

    // Generate subtasks for a goal using LLM
  async generateSubtasks(input) {
    try {
      // Validate input
      const validatedInput = generateSubtasksSchema.parse(input);
      const { goalDescription, context = {} } = validatedInput;

      if (!this.isGeminiAvailable) {
        // Fallback to simulated LLM response for development
        return this.generateSubtasksFallback(goalDescription, context);
      }

      // Build prompt for Gemini
      const prompt = this.buildSubtaskPrompt(goalDescription, context);
      
      // Generate content using Gemini
      const result = await this.geminiModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse the response
      return this.parseSubtasksResponse(text);
    } catch (error) {
      logger.error('LLM subtask generation failed:', error);
      
      // Fallback to simulated response on error
      const { goalDescription, context = {} } = input;
      return this.generateSubtasksFallback(goalDescription, context);
    }
  }

  // Build prompt for subtask generation
  buildSubtaskPrompt(goalDescription, context) {
    const { priority = 'MEDIUM', dueDate, project, teamSize = 1, skillLevel = 'intermediate', budget = 'medium', complexity = 'moderate' } = context;

    return `
Please break down the following goal into specific, actionable subtasks:

**Goal:** ${goalDescription}

**Context:**
- Priority: ${priority}
- Due Date: ${dueDate || 'Not specified'}
- Project: ${project || 'Personal'}
- Team Size: ${teamSize} person(s)
- Skill Level: ${skillLevel}
- Budget: ${budget}
- Complexity: ${complexity}

**Requirements:**
1. Create 3-8 specific, actionable subtasks
2. Each subtask should be achievable within the given timeframe
3. Order tasks logically (dependencies considered)
4. Make tasks specific enough to be measurable
5. Consider the team size and skill level
6. Include estimated hours for each task (be realistic)

**Response Format (JSON only):**
{
  "subtasks": [
    {
      "title": "Task title (max 50 characters)",
      "description": "Detailed description of what needs to be done",
      "estimatedHours": 2,
      "priority": "HIGH|MEDIUM|LOW",
      "dependencies": ["List of task titles this depends on"],
      "skills": ["Skills/expertise needed"],
      "category": "planning|execution|review|communication"
    }
  ],
  "reasoning": "Brief explanation of the breakdown approach and any important considerations",
  "estimatedTotalHours": 24,
  "criticalPath": ["List of task titles that are on the critical path"],
  "tips": ["2-3 helpful tips for successful completion"]
}`;
  }

  // Parse LLM response
  parseSubtasksResponse(response) {
    try {
      const parsed = JSON.parse(response);
      
      // Validate the response structure
      if (!parsed.subtasks || !Array.isArray(parsed.subtasks)) {
        throw new Error('Invalid response format: missing subtasks array');
      }

      // Clean and validate subtasks
      const subtasks = parsed.subtasks.map((task, index) => ({
        title: task.title?.substring(0, 100) || `Subtask ${index + 1}`,
        description: task.description || '',
        estimatedHours: typeof task.estimatedHours === 'number' ? task.estimatedHours : null,
        priority: ['HIGH', 'MEDIUM', 'LOW'].includes(task.priority) ? task.priority : 'MEDIUM',
        dependencies: Array.isArray(task.dependencies) ? task.dependencies : [],
        skills: Array.isArray(task.skills) ? task.skills : [],
        category: task.category || 'execution',
      }));

      return {
        success: true,
        subtasks,
        reasoning: parsed.reasoning || 'Tasks generated based on goal analysis',
        estimatedTotalHours: parsed.estimatedTotalHours || null,
        criticalPath: parsed.criticalPath || [],
        tips: parsed.tips || [],
        generatedBy: 'openai-gpt4',
      };
    } catch (error) {
      logger.error('Failed to parse LLM response:', error);
      throw new Error('Failed to parse LLM response');
    }
  }

  // Fallback subtask generation for development
  generateSubtasksFallback(goalDescription, context = {}) {
    const { priority = 'MEDIUM', teamSize = 1 } = context;
    
    // Simple keyword-based task generation
    const words = goalDescription.toLowerCase();
    let subtasks = [];

    // Planning phase tasks
    subtasks.push({
      title: 'Define project scope and requirements',
      description: `Clearly outline what needs to be accomplished for: ${goalDescription}`,
      estimatedHours: 3,
      priority: 'HIGH',
      dependencies: [],
      skills: ['planning', 'analysis'],
      category: 'planning',
    });

    // Execution tasks based on keywords
    if (words.includes('develop') || words.includes('build') || words.includes('create')) {
      subtasks.push({
        title: 'Set up development environment',
        description: 'Prepare all necessary tools and configurations',
        estimatedHours: 2,
        priority: 'HIGH',
        dependencies: ['Define project scope and requirements'],
        skills: ['technical setup'],
        category: 'execution',
      });

      subtasks.push({
        title: 'Implement core functionality',
        description: 'Build the main features and components',
        estimatedHours: 12,
        priority: 'HIGH',
        dependencies: ['Set up development environment'],
        skills: ['development', 'coding'],
        category: 'execution',
      });
    }

    if (words.includes('test') || words.includes('qa') || words.includes('quality')) {
      subtasks.push({
        title: 'Conduct thorough testing',
        description: 'Test all functionality and edge cases',
        estimatedHours: 4,
        priority: 'HIGH',
        dependencies: ['Implement core functionality'],
        skills: ['testing', 'qa'],
        category: 'review',
      });
    }

    if (words.includes('deploy') || words.includes('launch') || words.includes('release')) {
      subtasks.push({
        title: 'Prepare for deployment',
        description: 'Set up production environment and deployment pipeline',
        estimatedHours: 3,
        priority: 'MEDIUM',
        dependencies: ['Conduct thorough testing'],
        skills: ['devops', 'deployment'],
        category: 'execution',
      });
    }

    // Communication tasks for team projects
    if (teamSize > 1) {
      subtasks.push({
        title: 'Coordinate team activities',
        description: 'Regular check-ins and progress updates with team members',
        estimatedHours: 2,
        priority: 'MEDIUM',
        dependencies: [],
        skills: ['communication', 'project management'],
        category: 'communication',
      });
    }

    // Final review
    subtasks.push({
      title: 'Final review and documentation',
      description: 'Review completed work and create necessary documentation',
      estimatedHours: 2,
      priority: 'MEDIUM',
      dependencies: subtasks.slice(-1).map(t => t.title),
      skills: ['documentation', 'review'],
      category: 'review',
    });

    const totalHours = subtasks.reduce((sum, task) => sum + task.estimatedHours, 0);

    return {
      success: true,
      subtasks: subtasks.slice(0, 6), // Limit to 6 tasks
      reasoning: 'Tasks generated using keyword analysis and best practices for goal completion',
      estimatedTotalHours: totalHours,
      criticalPath: subtasks.slice(0, 3).map(t => t.title),
      tips: [
        'Break down large tasks into smaller, manageable chunks',
        'Set clear deadlines for each subtask',
        'Review progress regularly and adjust as needed',
      ],
      generatedBy: 'fallback-algorithm',
    };
  }

  // Optimize goal title using LLM
  async optimizeTitle(input) {
    try {
      const validatedInput = optimizeTitleSchema.parse(input);
      const { description, context = {} } = validatedInput;

      if (!this.isOpenAIAvailable) {
        return this.optimizeTitleFallback(description, context);
      }

      const { maxLength = 50, tone = 'professional' } = context;

      const prompt = `
Please create an optimized, compelling title for this goal/task:

**Description:** ${description}

**Requirements:**
- Maximum ${maxLength} characters
- Tone: ${tone}
- Clear and actionable
- Engaging but professional
- Specific and measurable when possible

**Response Format (JSON only):**
{
  "optimizedTitle": "The optimized title here",
  "alternatives": ["Alternative title 1", "Alternative title 2", "Alternative title 3"],
  "reasoning": "Brief explanation of why this title works better"
}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at creating clear, compelling, and actionable goal titles that motivate and provide clarity.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message.content);
      
      return {
        success: true,
        optimizedTitle: result.optimizedTitle,
        alternatives: result.alternatives || [],
        reasoning: result.reasoning,
        generatedBy: 'openai-gpt4',
      };
    } catch (error) {
      logger.error('Title optimization failed:', error);
      return this.optimizeTitleFallback(input.description, input.context);
    }
  }

  // Fallback title optimization
  optimizeTitleFallback(description, context = {}) {
    const { maxLength = 50 } = context;
    
    // Simple title optimization
    let title = description
      .substring(0, maxLength - 3)
      .replace(/^(create|build|develop|make|implement)/i, 'Build')
      .replace(/^(plan|design|strategy)/i, 'Plan')
      .replace(/^(test|qa|verify)/i, 'Test')
      .trim();

    if (title.length > maxLength) {
      title = title.substring(0, maxLength - 3) + '...';
    }

    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1);

    return {
      success: true,
      optimizedTitle: title,
      alternatives: [
        `Complete: ${title.substring(0, maxLength - 10)}`,
        `Achieve: ${title.substring(0, maxLength - 9)}`,
        `Deliver: ${title.substring(0, maxLength - 9)}`,
      ],
      reasoning: 'Title optimized using basic text processing rules',
      generatedBy: 'fallback-algorithm',
    };
  }

  // Get service status
  getStatus() {
    return {
      gemini: {
        available: this.isGeminiAvailable,
        configured: !!config.llm.geminiApiKey,
      },
      fallback: {
        available: true,
        description: 'Rule-based task generation',
      },
    };
  }
}

module.exports = new LLMService();