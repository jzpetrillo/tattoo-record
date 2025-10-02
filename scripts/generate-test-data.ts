import { db } from "../server/db";
import * as schema from "../shared/schema";
import bcrypt from "bcrypt";
import { eq, sql } from "drizzle-orm";

const TOTAL_USERS = 100;
const STUDIOS = 33;
const ARTISTS = 33;
const ENTHUSIASTS = 34;

async function generateTestData() {
  console.log("Starting test data generation...");

  // Create users
  const users: any[] = [];
  
  // Create Studios
  for (let i = 1; i <= STUDIOS; i++) {
    const username = `studio_${i}`;
    const email = `studio${i}@inktagram.com`;
    const hashedPassword = await bcrypt.hash("Test1234!", 10);
    
    const [user] = await db.insert(schema.users).values({
      username,
      email,
      hashedPassword,
      role: "STUDIO",
      bio: `Professional tattoo studio ${i}. Quality work, experienced artists.`,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${username}`,
      location: { city: `City ${i}`, country: "USA" },
      links: [`https://studio${i}.com`],
    }).returning();
    
    users.push(user);
    
    // Create studio profile
    await db.insert(schema.studioProfiles).values({
      userId: user.id,
      name: `Studio ${i}`,
      description: `Premium tattoo studio offering custom designs and professional service.`,
      services: ["Custom Tattoos", "Cover-ups", "Touch-ups"],
      hours: { "Mon-Fri": "10AM-8PM", "Sat": "11AM-6PM" },
      paymentMethods: ["Cash", "Card", "Venmo"],
    });
  }
  
  // Create Artists
  for (let i = 1; i <= ARTISTS; i++) {
    const username = `artist_${i}`;
    const email = `artist${i}@inktagram.com`;
    const hashedPassword = await bcrypt.hash("Test1234!", 10);
    
    const [user] = await db.insert(schema.users).values({
      username,
      email,
      hashedPassword,
      role: "ARTIST",
      bio: `Tattoo artist specializing in ${i % 2 === 0 ? 'traditional' : 'modern'} styles.`,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      location: { city: `City ${i}`, country: "USA" },
    }).returning();
    
    users.push(user);
    
    // Connect some artists to studios (half of them)
    if (i <= Math.floor(ARTISTS / 2)) {
      const studioUser = users[i % STUDIOS];
      await db.insert(schema.studioApprovalRequests).values({
        studioId: studioUser.id,
        artistId: user.id,
        status: "APPROVED",
        note: "Welcome to the team!",
      });
    }
  }
  
  // Create Enthusiasts
  for (let i = 1; i <= ENTHUSIASTS; i++) {
    const username = `user_${i}`;
    const email = `user${i}@inktagram.com`;
    const hashedPassword = await bcrypt.hash("Test1234!", 10);
    
    const [user] = await db.insert(schema.users).values({
      username,
      email,
      hashedPassword,
      role: "ENTHUSIAST",
      bio: `Tattoo enthusiast. Love collecting ink!`,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
    }).returning();
    
    users.push(user);
  }
  
  console.log(`Created ${users.length} users`);
  
  // Create posts for everyone
  for (const user of users) {
    const numPosts = Math.floor(Math.random() * 5) + 1;
    for (let i = 0; i < numPosts; i++) {
      await db.insert(schema.posts).values({
        authorId: user.id,
        caption: `Check out this amazing ${user.role === 'STUDIO' ? 'studio work' : user.role === 'ARTIST' ? 'piece' : 'tattoo'}! #tattoo #ink`,
        media: [{
          publicId: `post_${user.username}_${i}`,
          url: `https://picsum.photos/seed/${user.username}_${i}/800/800`,
          type: "image",
          width: 800,
          height: 800,
        }],
        visibility: "PUBLIC",
      });
    }
  }
  
  console.log("Created posts for all users");
  
  // Create stories for random users
  const usersWithStories = users.slice(0, 30);
  for (const user of usersWithStories) {
    await db.insert(schema.stories).values({
      userId: user.id,
      media: [{
        publicId: `story_${user.username}`,
        url: `https://picsum.photos/seed/story_${user.username}/600/1000`,
        type: "image",
        width: 600,
        height: 1000,
      }],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    });
  }
  
  console.log("Created stories");
  
  // Create some follows
  for (let i = 0; i < 50; i++) {
    const follower = users[Math.floor(Math.random() * users.length)];
    const following = users[Math.floor(Math.random() * users.length)];
    if (follower.id !== following.id) {
      try {
        await db.insert(schema.follows).values({
          followerId: follower.id,
          followingId: following.id,
        });
      } catch (e) {
        // Ignore duplicate follows
      }
    }
  }
  
  console.log("Created follows");
  
  // Create some likes
  const allPosts = await db.select().from(schema.posts).limit(100);
  for (const post of allPosts) {
    const numLikes = Math.floor(Math.random() * 10);
    for (let i = 0; i < numLikes; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      try {
        await db.insert(schema.postLikes).values({
          postId: post.id,
          userId: user.id,
        });
      } catch (e) {
        // Ignore duplicate likes
      }
    }
  }
  
  console.log("Created likes");
  
  // Create some conversations and messages
  for (let i = 0; i < 20; i++) {
    const user1 = users[Math.floor(Math.random() * users.length)];
    const user2 = users[Math.floor(Math.random() * users.length)];
    if (user1.id !== user2.id) {
      const [conversation] = await db.insert(schema.conversations).values({}).returning();
      
      await db.insert(schema.conversationParticipants).values([
        { conversationId: conversation.id, userId: user1.id },
        { conversationId: conversation.id, userId: user2.id },
      ]);
      
      // Add some messages
      for (let j = 0; j < 5; j++) {
        await db.insert(schema.messages).values({
          conversationId: conversation.id,
          senderId: j % 2 === 0 ? user1.id : user2.id,
          body: `Hey! Message ${j + 1}`,
        });
      }
    }
  }
  
  console.log("Created conversations and messages");
  
  // Create some test notifications
  for (let i = 0; i < 30; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const actor = users[Math.floor(Math.random() * users.length)];
    
    if (user.id !== actor.id) {
      const notificationType = ["FOLLOW", "LIKE", "COMMENT", "SYSTEM"][Math.floor(Math.random() * 4)];
      
      await db.insert(schema.notifications).values({
        userId: user.id,
        type: notificationType as "FOLLOW" | "LIKE" | "COMMENT" | "SYSTEM",
        payload: {
          actorId: actor.id,
          message: notificationType === "SYSTEM" ? "Welcome to Inktagram!" : undefined,
        },
        isRead: Math.random() > 0.5,
      });
    }
  }
  
  console.log("Created test notifications");
  
  console.log("✅ Test data generation complete!");
  console.log(`Total users: ${TOTAL_USERS}`);
  console.log(`Studios: ${STUDIOS}`);
  console.log(`Artists: ${ARTISTS} (${Math.floor(ARTISTS / 2)} connected to studios)`);
  console.log(`Enthusiasts: ${ENTHUSIASTS}`);
}

generateTestData().then(() => {
  console.log("Done!");
  process.exit(0);
}).catch((error) => {
  console.error("Error generating test data:", error);
  process.exit(1);
});
