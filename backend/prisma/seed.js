const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create default platform tags
  const platformTags = await Promise.all([
    prisma.platformTag.upsert({
      where: { name: 'Web' },
      update: {},
      create: { name: 'Web', color: '#3B82F6' },
    }),
    prisma.platformTag.upsert({
      where: { name: 'Mobile' },
      update: {},
      create: { name: 'Mobile', color: '#10B981' },
    }),
    prisma.platformTag.upsert({
      where: { name: 'API' },
      update: {},
      create: { name: 'API', color: '#F59E0B' },
    }),
    prisma.platformTag.upsert({
      where: { name: 'Desktop' },
      update: {},
      create: { name: 'Desktop', color: '#8B5CF6' },
    }),
    prisma.platformTag.upsert({
      where: { name: 'Analytics' },
      update: {},
      create: { name: 'Analytics', color: '#EF4444' },
    }),
  ]);

  console.log(`✅ Created ${platformTags.length} platform tags`);

  // Create a demo user
  const hashedPassword = await bcrypt.hash('demo123', 12);
  
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      passwordHash: hashedPassword,
      firstName: 'Demo',
      lastName: 'User',
    },
  });

  console.log(`✅ Created demo user: ${demoUser.email}`);

  // Create a demo project
  const demoProject = await prisma.project.upsert({
    where: { id: 'demo-project-id' },
    update: {},
    create: {
      id: 'demo-project-id',
      name: 'Productivity Dashboard',
      description: 'Building an AI-powered productivity dashboard',
      color: '#3B82F6',
      ownerId: demoUser.id,
    },
  });

  console.log(`✅ Created demo project: ${demoProject.name}`);

  // Create demo goals with subtasks
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const goal1 = await prisma.goal.create({
    data: {
      title: 'Launch Product Beta',
      description: 'Prepare and launch the beta version of our productivity dashboard',
      priority: 'HIGH',
      dueDate: tomorrow,
      projectId: demoProject.id,
      ownerId: demoUser.id,
      subtasks: {
        create: [
          {
            title: 'Finalize landing page design',
            description: 'Complete the responsive design for the landing page',
          },
          {
            title: 'QA test checkout flow',
            description: 'Thoroughly test the user registration and onboarding flow',
          },
          {
            title: 'Record demo video',
            description: 'Create a 2-minute product demonstration video',
          },
        ],
      },
      platformTags: {
        create: [
          { platformTagId: platformTags[0].id }, // Web
          { platformTagId: platformTags[1].id }, // Mobile
        ],
      },
    },
  });

  const goal2 = await prisma.goal.create({
    data: {
      title: 'Marketing Campaign Setup',
      description: 'Prepare marketing materials and campaigns for product launch',
      priority: 'MEDIUM',
      dueDate: tomorrow,
      projectId: demoProject.id,
      ownerId: demoUser.id,
      subtasks: {
        create: [
          {
            title: 'Draft announcement blog post',
            description: 'Write compelling announcement for the product launch',
          },
          {
            title: 'Plan social media posts',
            description: 'Create content calendar for social media promotion',
            completed: true,
          },
          {
            title: 'Design promotional graphics',
            description: 'Create visual assets for marketing campaigns',
          },
        ],
      },
      platformTags: {
        create: [
          { platformTagId: platformTags[0].id }, // Web
        ],
      },
    },
  });

  console.log(`✅ Created ${2} demo goals with subtasks`);

  // Create team member assignments
  await prisma.teamMember.createMany({
    data: [
      {
        userId: demoUser.id,
        goalId: goal1.id,
        role: 'Project Lead',
        initials: 'DU',
      },
      {
        userId: demoUser.id,
        goalId: goal2.id,
        role: 'Marketing Lead',
        initials: 'DU',
      },
    ],
  });

  console.log(`✅ Created team member assignments`);

  // Create sample LLM conversation
  await prisma.llmConversation.create({
    data: {
      userId: demoUser.id,
      goalId: goal1.id,
      messages: [
        {
          role: 'user',
          content: 'Help me break down the goal of launching a product beta',
        },
        {
          role: 'assistant',
          content: 'I can help you break this down into actionable subtasks: 1. Finalize landing page design, 2. QA test checkout flow, 3. Record demo video',
        },
      ],
      modelUsed: 'gpt-4',
    },
  });

  console.log(`✅ Created sample LLM conversation`);

  console.log('🎉 Database seeding completed successfully!');
  console.log(`
📊 Summary:
- Users: 1
- Projects: 1  
- Goals: 2
- Subtasks: 6
- Platform Tags: 5
- Team Members: 2
- LLM Conversations: 1

🔐 Demo Login:
Email: demo@example.com
Password: demo123
  `);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });