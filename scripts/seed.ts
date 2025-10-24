import { faker } from "@faker-js/faker";
import { db } from "../server/db";
import { users, posts, messages, conversations, conversationParticipants, notifications, follows } from "../shared/schema";
import { eq, inArray, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

const TOTAL_USERS = 60;
const STUDIOS_COUNT = 20;
const ARTISTS_COUNT = 20;
const ENTHUSIASTS_COUNT = 20;
const POSTS_PER_USER_MIN = 3;
const POSTS_PER_USER_MAX = 5;
const TOTAL_MESSAGES = 50;
const TOTAL_NOTIFICATIONS = 60;

async function cleanupSeedData() {
  console.log("🧹 Cleaning up existing seed data...");
  
  await db.delete(messages).where(sql`body LIKE '%seed%' OR body LIKE '%Hey, love your work!%'`);
  await db.delete(conversationParticipants);
  await db.delete(conversations);
  await db.delete(notifications).where(sql`payload->>'seed' = 'true'`);
  await db.delete(posts).where(sql`caption LIKE '%#seed%'`);
  
  const seedUsers = await db.select().from(users).where(
    sql`email LIKE 'seed_%' OR username LIKE 'seed_%'`
  );
  
  if (seedUsers.length > 0) {
    const seedUserIds = seedUsers.map(u => u.id);
    await db.delete(users).where(inArray(users.id, seedUserIds));
  }
  
  console.log("✅ Cleanup complete");
}

function generateUsername(baseName: string): string {
  const cleaned = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const suffix = Math.floor(Math.random() * 9999);
  return `seed_${cleaned}_${suffix}`.substring(0, 50);
}

async function createUsers() {
  console.log("👥 Creating users...");
  
  const hashedPassword = await bcrypt.hash("Test1234!", 10);
  const createdUsers: any[] = [];
  
  // Create 20 Studios
  for (let i = 0; i < STUDIOS_COUNT; i++) {
    const studioName = faker.company.name().replace(/[,\.]/g, '');
    const username = generateUsername(studioName);
    
    const user = await db.insert(users).values({
      email: `seed_studio_${i}@inktagram.com`,
      username,
      hashedPassword,
      role: "STUDIO",
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      bio: faker.company.catchPhrase(),
      avatarUrl: faker.image.avatar(),
      bannerImageUrl: `https://picsum.photos/seed/studio${i}/1200/400`,
      website: `https://studio-${username}.tattoo`,
      location: {
        city: faker.location.city(),
        country: faker.location.country(),
        lat: parseFloat(faker.location.latitude()),
        lng: parseFloat(faker.location.longitude())
      },
      verificationStatus: "APPROVED",
      isVerified: true
    }).returning();
    
    createdUsers.push({ ...user[0], userType: 'STUDIO' });
  }
  
  // Get studio IDs for linking artists
  const studioUsers = createdUsers.filter(u => u.role === 'STUDIO');
  
  // Create 20 Artists
  for (let i = 0; i < ARTISTS_COUNT; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const username = generateUsername(`${firstName}${lastName}`);
    const randomStudio = faker.helpers.arrayElement(studioUsers);
    
    const user = await db.insert(users).values({
      email: `seed_artist_${i}@inktagram.com`,
      username,
      hashedPassword,
      role: "ARTIST",
      firstName,
      lastName,
      bio: `${faker.lorem.sentence()} | Specializing in ${faker.helpers.arrayElement(['Realism', 'Traditional', 'Japanese', 'Blackwork', 'Neo-Traditional', 'Watercolor'])}`,
      avatarUrl: faker.image.avatar(),
      bannerImageUrl: `https://picsum.photos/seed/artist${i}/1200/400`,
      website: `https://${username}-art.com`,
      instagram: `@${username}`,
      tiktok: `@${username}_tattoos`,
      twitter: `@${username}`,
      location: {
        city: faker.location.city(),
        country: faker.location.country()
      },
      verificationStatus: "APPROVED",
      isVerified: true
    }).returning();
    
    createdUsers.push({ ...user[0], userType: 'ARTIST', studioId: randomStudio.id });
  }
  
  // Create 20 Enthusiasts
  for (let i = 0; i < ENTHUSIASTS_COUNT; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const username = generateUsername(`${firstName}${lastName}`);
    
    const user = await db.insert(users).values({
      email: `seed_enthusiast_${i}@inktagram.com`,
      username,
      hashedPassword,
      role: "ENTHUSIAST",
      firstName,
      lastName,
      bio: faker.lorem.sentence(),
      avatarUrl: faker.image.avatar(),
      bannerImageUrl: `https://picsum.photos/seed/enthusiast${i}/1200/400`,
      website: Math.random() > 0.5 ? `https://${username}.com` : undefined,
      instagram: Math.random() > 0.3 ? `@${username}` : undefined,
      location: {
        city: faker.location.city(),
        country: faker.location.country()
      }
    }).returning();
    
    createdUsers.push({ ...user[0], userType: 'ENTHUSIAST' });
  }
  
  console.log(`✅ Created ${createdUsers.length} users`);
  return createdUsers;
}

async function createPosts(users: any[]) {
  console.log("📸 Creating posts...");
  
  let totalPosts = 0;
  const postTypes = ['POST', 'REEL', 'STORY'] as const;
  const allPosts: any[] = [];
  
  for (const user of users) {
    const postsCount = faker.number.int({ min: POSTS_PER_USER_MIN, max: POSTS_PER_USER_MAX });
    
    for (let i = 0; i < postsCount; i++) {
      const postType = faker.helpers.arrayElement(postTypes);
      const isVideo = postType === 'REEL';
      
      const post = await db.insert(posts).values({
        authorId: user.id,
        type: postType,
        caption: `${faker.lorem.sentence()} #seed #tattoo #${postType.toLowerCase()}`,
        media: [{
          publicId: `seed_${user.id}_${i}`,
          url: isVideo 
            ? `https://picsum.photos/seed/video${user.id}${i}/800/800` 
            : `https://picsum.photos/seed/post${user.id}${i}/800/800`,
          type: isVideo ? 'video' : 'image',
          width: 800,
          height: 800,
          duration: isVideo ? faker.number.int({ min: 15, max: 60 }) : undefined
        }],
        likeCount: faker.number.int({ min: 0, max: 500 }),
        commentCount: faker.number.int({ min: 0, max: 50 }),
        location: user.location
      }).returning();
      
      allPosts.push(post[0]);
      totalPosts++;
    }
  }
  
  console.log(`✅ Created ${totalPosts} posts`);
  return allPosts;
}

async function createMessages(users: any[]) {
  console.log("💬 Creating messages...");
  
  const conversationMap = new Map<string, string>();
  
  for (let i = 0; i < TOTAL_MESSAGES; i++) {
    const user1 = faker.helpers.arrayElement(users);
    let user2 = faker.helpers.arrayElement(users);
    
    // Avoid self-messaging
    while (user2.id === user1.id) {
      user2 = faker.helpers.arrayElement(users);
    }
    
    // Create conversation key (sorted to ensure uniqueness)
    const convKey = [user1.id, user2.id].sort().join('_');
    
    let conversationId: string;
    
    if (conversationMap.has(convKey)) {
      conversationId = conversationMap.get(convKey)!;
    } else {
      // Create new conversation
      const conv = await db.insert(conversations).values({
        isGroup: false,
        lastMessageAt: new Date()
      }).returning();
      
      conversationId = conv[0].id;
      conversationMap.set(convKey, conversationId);
      
      // Add participants
      await db.insert(conversationParticipants).values([
        {
          conversationId,
          userId: user1.id,
          lastReadAt: new Date()
        },
        {
          conversationId,
          userId: user2.id,
          lastReadAt: new Date()
        }
      ]);
    }
    
    // Create message
    const messageTexts = [
      "Hey, love your work!",
      "That tattoo looks amazing!",
      "Are you taking new clients?",
      "What's your availability like?",
      "Thanks for the follow!",
      "Your portfolio is incredible!",
      "Do you do custom designs?",
      "I'd love to book a consultation",
      "Amazing piece! What style is that?",
      "How long have you been tattooing?"
    ];
    
    await db.insert(messages).values({
      conversationId,
      senderId: faker.helpers.arrayElement([user1.id, user2.id]),
      body: faker.helpers.arrayElement(messageTexts)
    });
  }
  
  console.log(`✅ Created ${TOTAL_MESSAGES} messages in ${conversationMap.size} conversations`);
}

async function createFollows(users: any[]) {
  console.log("👥 Creating follow relationships...");
  
  let followsCreated = 0;
  
  // Each user follows 5-15 random other users
  for (const user of users) {
    const followCount = faker.number.int({ min: 5, max: 15 });
    const otherUsers = users.filter(u => u.id !== user.id);
    const usersToFollow = faker.helpers.arrayElements(otherUsers, Math.min(followCount, otherUsers.length));
    
    for (const userToFollow of usersToFollow) {
      try {
        await db.insert(follows).values({
          followerId: user.id,
          followingId: userToFollow.id
        });
        followsCreated++;
      } catch (error) {
        // Skip duplicates
      }
    }
  }
  
  console.log(`✅ Created ${followsCreated} follow relationships`);
  return followsCreated;
}

async function createNotifications(users: any[], posts: any[]) {
  console.log("🔔 Creating notifications...");
  
  const notificationTypes = ['LIKE', 'COMMENT', 'FOLLOW', 'SYSTEM'] as const;
  
  for (let i = 0; i < TOTAL_NOTIFICATIONS; i++) {
    const recipient = faker.helpers.arrayElement(users);
    const actor = faker.helpers.arrayElement(users.filter(u => u.id !== recipient.id));
    const type = faker.helpers.arrayElement(notificationTypes);
    
    let payload: any = { seed: 'true', actorId: actor.id };
    
    if (type === 'LIKE' || type === 'COMMENT') {
      const post = faker.helpers.arrayElement(posts);
      payload.postId = post.id;
    }
    
    await db.insert(notifications).values({
      userId: recipient.id,
      type,
      payload,
      isRead: faker.datatype.boolean()
    });
  }
  
  console.log(`✅ Created ${TOTAL_NOTIFICATIONS} notifications`);
}

async function main() {
  console.log("🌱 Starting seed process...\n");
  
  try {
    await cleanupSeedData();
    const users = await createUsers();
    const posts = await createPosts(users);
    const followsCount = await createFollows(users);
    await createMessages(users);
    await createNotifications(users, posts);
    
    console.log("\n✨ Seed complete!");
    console.log(`📊 Summary:`);
    console.log(`   - ${STUDIOS_COUNT} Studios`);
    console.log(`   - ${ARTISTS_COUNT} Artists`);
    console.log(`   - ${ENTHUSIASTS_COUNT} Enthusiasts`);
    console.log(`   - ${posts.length} Posts (mix of POST, REEL, STORY)`);
    console.log(`   - ${followsCount} Follow relationships`);
    console.log(`   - ${TOTAL_MESSAGES} Messages`);
    console.log(`   - ${TOTAL_NOTIFICATIONS} Notifications`);
    console.log(`\n🔑 Test credentials: seed_[type]_[number]@inktagram.com / Test1234!`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

main();
