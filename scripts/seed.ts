import { db } from "../server/db";
import { faker } from "@faker-js/faker";
import bcrypt from "bcrypt";
import * as schema from "../shared/schema";

// COMPREHENSIVE DATABASE SEEDING SCRIPT FOR INKTAGRAM
// Creates realistic test data for ALL user-related features
// Run with: npm run seed

// Tattoo-specific data
const TATTOO_STYLES = [
  "Traditional", "Neo-Traditional", "Japanese", "Blackwork", "Realism",
  "Watercolor", "Tribal", "Geometric", "Dotwork", "Minimalist",
  "Illustrative", "Biomechanical", "New School", "Fine Line", "Ornamental"
];

const TATTOO_HASHTAGS = [
  "inked", "tattooart", "tattooed", "tattoolife", "tattoodesign",
  "bodyart", "inkstagram", "tattooideas", "tattooartist", "tattoowork",
  "tattooinspiration", "customtattoo", "tattoocommunity", "tattoolove",
  "tattoosketch", "tattoostyle", "blackandgrey", "colortattoo", "sleevetattoo"
];

const CITIES = [
  { city: "New York", country: "USA", lat: 40.7128, lng: -74.0060 },
  { city: "Los Angeles", country: "USA", lat: 34.0522, lng: -118.2437 },
  { city: "London", country: "UK", lat: 51.5074, lng: -0.1278 },
  { city: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503 },
  { city: "Berlin", country: "Germany", lat: 52.5200, lng: 13.4050 },
  { city: "Paris", country: "France", lat: 48.8566, lng: 2.3522 },
  { city: "Sydney", country: "Australia", lat: -33.8688, lng: 151.2093 },
  { city: "Toronto", country: "Canada", lat: 43.6532, lng: -79.3832 },
];

const POST_CAPTIONS = [
  "Fresh ink! What do you think? 🔥",
  "Another day, another masterpiece ✨",
  "Client wanted something bold and I delivered 💪",
  "Progress shot of this sleeve I'm working on",
  "Healed photo - still loving how this turned out!",
  "First session done, can't wait for the next one",
  "This piece has special meaning to the client ❤️",
  "When the design flows perfectly on the skin",
  "Taking bookings for next month! DM for inquiries",
  "Throwback to one of my favorite pieces",
];

const REEL_CAPTIONS = [
  "Watch me create this design from scratch! 🎨",
  "Time lapse of today's session ⚡",
  "The process behind the art 🔍",
  "Before and after - what a transformation!",
  "Quick tip for tattoo aftercare 💡",
  "Behind the scenes at the studio",
];

async function clearDatabase() {
  console.log("🗑️  Clearing existing data...");
  
  // Delete in correct order to respect foreign keys
  await db.delete(schema.postHashtags);
  await db.delete(schema.postShares);
  await db.delete(schema.liveReactions);
  await db.delete(schema.liveComments);
  await db.delete(schema.livestreamParticipants);
  await db.delete(schema.livestreamEvents);
  await db.delete(schema.jobApplications);
  await db.delete(schema.jobPostings);
  await db.delete(schema.consultationRequests);
  await db.delete(schema.studioApprovalRequests);
  await db.delete(schema.portfolioItems);
  await db.delete(schema.highlightStories);
  await db.delete(schema.storyHighlights);
  await db.delete(schema.stories);
  await db.delete(schema.messages);
  await db.delete(schema.conversationParticipants);
  await db.delete(schema.conversations);
  await db.delete(schema.notifications);
  await db.delete(schema.comments);
  await db.delete(schema.postLikes);
  await db.delete(schema.follows);
  await db.delete(schema.posts);
  await db.delete(schema.hashtags);
  await db.delete(schema.artistProfiles);
  await db.delete(schema.studioProfiles);
  await db.delete(schema.users);
  
  console.log("✅ Database cleared");
}

async function seedUsers() {
  console.log("👥 Creating users...");
  
  const hashedPassword = await bcrypt.hash("Test1234!", 10);
  const users: typeof schema.users.$inferInsert[] = [];
  
  // Create 1 admin
  users.push({
    email: "admin@inktagram.com",
    username: "admin_inktagram",
    hashedPassword,
    role: "ADMIN" as const,
    firstName: "Admin",
    lastName: "User",
    bio: "Platform administrator",
    isVerified: true,
    verificationStatus: "APPROVED" as const,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=admin`,
  });
  
  // Create 15 studios
  for (let i = 1; i <= 15; i++) {
    const location = faker.helpers.arrayElement(CITIES);
    const studioDisplayName = `${faker.company.catchPhraseAdjective()} ${faker.helpers.arrayElement(["Ink", "Tattoo", "Studio", "Art"])}`;
    
    users.push({
      email: `studio${i}@inktagram.com`,
      username: `studio${i}`,
      hashedPassword,
      role: "STUDIO" as const,
      firstName: studioDisplayName,
      lastName: "Studio",
      bio: `Professional tattoo studio in ${location.city}. ${faker.company.catchPhrase()}`,
      isVerified: i <= 10,
      verificationStatus: i <= 10 ? "APPROVED" as const : "PENDING" as const,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${studioDisplayName}`,
      location,
      website: faker.internet.url(),
      instagram: faker.internet.username().toLowerCase(),
    });
  }
  
  // Create 30 artists
  for (let i = 1; i <= 30; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const location = faker.helpers.arrayElement(CITIES);
    
    users.push({
      email: `artist${i}@inktagram.com`,
      username: `artist${i}`,
      hashedPassword,
      role: "ARTIST" as const,
      firstName,
      lastName,
      bio: `Tattoo artist specializing in ${faker.helpers.arrayElements(TATTOO_STYLES, 2).join(" & ")}. ${faker.lorem.sentence()}`,
      isVerified: i <= 20,
      verificationStatus: i <= 20 ? "APPROVED" as const : "PENDING" as const,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firstName}${i}`,
      location,
      instagram: faker.internet.username().toLowerCase(),
      tiktok: i % 3 === 0 ? faker.internet.username().toLowerCase() : undefined,
      twitter: i % 4 === 0 ? faker.internet.username().toLowerCase() : undefined,
    });
  }
  
  // Create 20 enthusiasts
  for (let i = 1; i <= 20; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    
    users.push({
      email: `enthusiast${i}@inktagram.com`,
      username: `enthusiast${i}`,
      hashedPassword,
      role: "ENTHUSIAST" as const,
      firstName,
      lastName,
      bio: faker.lorem.sentence(),
      isVerified: true,
      verificationStatus: "APPROVED" as const,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firstName}${lastName}${i}`,
    });
  }
  
  const insertedUsers = await db.insert(schema.users).values(users).returning();
  console.log(`✅ Created ${insertedUsers.length} users`);
  
  return insertedUsers;
}

async function seedProfiles(users: typeof schema.users.$inferSelect[]) {
  console.log("🏢 Creating studio and artist profiles...");
  
  const studios = users.filter(u => u.role === "STUDIO");
  const artists = users.filter(u => u.role === "ARTIST");
  
  // Create studio profiles
  const studioProfiles: typeof schema.studioProfiles.$inferInsert[] = studios.map(studio => ({
    userId: studio.id,
    name: studio.firstName || "Studio",
    description: studio.bio || faker.lorem.paragraph(),
    services: faker.helpers.arrayElements(TATTOO_STYLES, faker.number.int({ min: 3, max: 8 })),
    hours: {
      monday: "10:00 AM - 8:00 PM",
      tuesday: "10:00 AM - 8:00 PM",
      wednesday: "10:00 AM - 8:00 PM",
      thursday: "10:00 AM - 8:00 PM",
      friday: "10:00 AM - 10:00 PM",
      saturday: "12:00 PM - 10:00 PM",
      sunday: "Closed"
    },
    paymentMethods: ["Cash", "Card", "Venmo", "PayPal"],
  }));
  
  await db.insert(schema.studioProfiles).values(studioProfiles);
  
  // Create artist profiles
  const artistProfiles: typeof schema.artistProfiles.$inferInsert[] = artists.map(artist => ({
    userId: artist.id,
    styles: faker.helpers.arrayElements(TATTOO_STYLES, faker.number.int({ min: 2, max: 5 })),
    rateCents: faker.number.int({ min: 10000, max: 30000 }), // $100-$300 per hour
    yearsExperience: faker.number.int({ min: 1, max: 20 }),
    availability: {
      status: faker.helpers.arrayElement(["available", "booking", "limited"]),
      nextAvailable: faker.date.future().toISOString(),
    },
  }));
  
  await db.insert(schema.artistProfiles).values(artistProfiles);
  
  console.log(`✅ Created ${studioProfiles.length} studio profiles and ${artistProfiles.length} artist profiles`);
}

async function seedHashtags() {
  console.log("🏷️  Creating hashtags...");
  
  const hashtags = TATTOO_HASHTAGS.map(tag => ({
    tag: tag,
    uses: faker.number.int({ min: 100, max: 10000 }),
  }));
  
  const insertedHashtags = await db.insert(schema.hashtags).values(hashtags).returning();
  console.log(`✅ Created ${insertedHashtags.length} hashtags`);
  
  return insertedHashtags;
}

async function seedPosts(users: typeof schema.users.$inferSelect[], hashtags: typeof schema.hashtags.$inferSelect[]) {
  console.log("📸 Creating posts, reels, and stories...");
  
  const contentCreators = users.filter(u => u.role === "ARTIST" || u.role === "STUDIO");
  const allPosts: typeof schema.posts.$inferInsert[] = [];
  
  for (const user of contentCreators) {
    // Create 10-15 regular posts per user
    const numPosts = faker.number.int({ min: 10, max: 15 });
    for (let i = 0; i < numPosts; i++) {
      const hasMedia = faker.datatype.boolean(0.8); // 80% have media
      
      allPosts.push({
        authorId: user.id,
        type: "POST" as const,
        caption: faker.helpers.arrayElement(POST_CAPTIONS) + " " + faker.helpers.arrayElements(TATTOO_HASHTAGS, 3).map(t => `#${t}`).join(" "),
        media: hasMedia ? [{
          publicId: faker.string.uuid(),
          url: `https://picsum.photos/seed/${faker.string.uuid()}/800/800`,
          type: "image",
          width: 800,
          height: 800,
        }] : [],
        visibility: faker.helpers.arrayElement(["PUBLIC", "FOLLOWERS"]) as any,
        createdAt: faker.date.past({ years: 1 }),
      });
    }
    
    // Create 5-10 reels per user
    const numReels = faker.number.int({ min: 5, max: 10 });
    for (let i = 0; i < numReels; i++) {
      allPosts.push({
        authorId: user.id,
        type: "REEL" as const,
        caption: faker.helpers.arrayElement(REEL_CAPTIONS) + " " + faker.helpers.arrayElements(TATTOO_HASHTAGS, 2).map(t => `#${t}`).join(" "),
        media: [{
          publicId: faker.string.uuid(),
          url: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`,
          type: "video",
          width: 1080,
          height: 1920,
          duration: faker.number.int({ min: 15, max: 60 }),
        }],
        visibility: "PUBLIC" as const,
        createdAt: faker.date.past({ years: 1 }),
      });
    }
  }
  
  const insertedPosts = await db.insert(schema.posts).values(allPosts).returning();
  console.log(`✅ Created ${insertedPosts.length} posts and reels`);
  
  // Link posts to hashtags
  const postHashtagLinks: typeof schema.postHashtags.$inferInsert[] = [];
  for (const post of insertedPosts) {
    const numTags = faker.number.int({ min: 2, max: 5 });
    const selectedTags = faker.helpers.arrayElements(hashtags, numTags);
    
    for (const tag of selectedTags) {
      postHashtagLinks.push({
        postId: post.id,
        hashtagId: tag.id,
      });
    }
  }
  
  await db.insert(schema.postHashtags).values(postHashtagLinks);
  console.log(`✅ Linked posts to hashtags`);
  
  return insertedPosts;
}

async function seedSocialInteractions(users: typeof schema.users.$inferSelect[], posts: typeof schema.posts.$inferSelect[]) {
  console.log("💬 Creating social interactions (likes, comments, follows)...");
  
  const allUsers = users;
  
  // Create follows - each user follows 10-20 others
  const follows: typeof schema.follows.$inferInsert[] = [];
  for (const user of allUsers) {
    const numFollows = faker.number.int({ min: 10, max: 20 });
    const toFollow = faker.helpers.arrayElements(
      allUsers.filter(u => u.id !== user.id),
      Math.min(numFollows, allUsers.length - 1)
    );
    
    for (const followedUser of toFollow) {
      follows.push({
        followerId: user.id,
        followingId: followedUser.id,
      });
    }
  }
  
  await db.insert(schema.follows).values(follows);
  console.log(`✅ Created ${follows.length} follow relationships`);
  
  // Create likes - each post gets 5-50 likes
  const likes: typeof schema.postLikes.$inferInsert[] = [];
  for (const post of posts) {
    const numLikes = faker.number.int({ min: 5, max: 50 });
    const likers = faker.helpers.arrayElements(allUsers, Math.min(numLikes, allUsers.length));
    
    for (const liker of likers) {
      likes.push({
        postId: post.id,
        userId: liker.id,
      });
    }
  }
  
  await db.insert(schema.postLikes).values(likes);
  console.log(`✅ Created ${likes.length} post likes`);
  
  // Create comments - each post gets 3-15 comments
  const comments: typeof schema.comments.$inferInsert[] = [];
  const commentTexts = [
    "Amazing work! 🔥", "This is incredible!", "Love the detail on this",
    "How long did this take?", "Absolutely stunning ✨", "Can I book with you?",
    "The shading is perfect!", "This is my favorite style", "Wow, just wow!",
    "Incredible artistry 🎨",
  ];
  
  for (const post of posts) {
    const numComments = faker.number.int({ min: 3, max: 15 });
    const commenters = faker.helpers.arrayElements(allUsers, Math.min(numComments, allUsers.length));
    
    for (const commenter of commenters) {
      comments.push({
        postId: post.id,
        userId: commenter.id,
        body: faker.helpers.arrayElement(commentTexts),
      });
    }
  }
  
  await db.insert(schema.comments).values(comments);
  console.log(`✅ Created ${comments.length} comments`);
}

async function seedPortfolio(users: typeof schema.users.$inferSelect[]) {
  console.log("🎨 Creating portfolio items for all users...");
  
  const portfolioItems: typeof schema.portfolioItems.$inferInsert[] = [];
  
  // Portfolio titles based on role
  const artistTitles = ["Sleeve", "Piece", "Design", "Work", "Art", "Commission"];
  const studioTitles = ["Featured Work", "Client Piece", "Studio Specialty", "Collaboration"];
  const enthusiastTitles = ["My Tattoo", "First Ink", "Favorite Piece", "Collection", "Memorial Tattoo", "Tribute Piece"];
  
  // Create portfolio items for ARTISTS (10-20 items each)
  const artists = users.filter(u => u.role === "ARTIST");
  for (const artist of artists) {
    const numItems = faker.number.int({ min: 10, max: 20 });
    
    for (let i = 0; i < numItems; i++) {
      portfolioItems.push({
        artistId: artist.id,
        title: `${faker.helpers.arrayElement(TATTOO_STYLES)} ${faker.helpers.arrayElement(artistTitles)}`,
        description: faker.lorem.paragraph(),
        media: Array.from({ length: faker.number.int({ min: 1, max: 4 }) }, () => ({
          publicId: faker.string.uuid(),
          url: `https://picsum.photos/seed/${faker.string.uuid()}/800/600`,
          type: "image",
          width: 800,
          height: 600,
        })),
        categories: faker.helpers.arrayElements(TATTOO_STYLES, faker.number.int({ min: 1, max: 3 })),
        sortOrder: i,
      });
    }
  }
  
  // Create portfolio items for STUDIOS (15-25 items each - showcasing their artists' work)
  const studios = users.filter(u => u.role === "STUDIO");
  for (const studio of studios) {
    const numItems = faker.number.int({ min: 15, max: 25 });
    
    for (let i = 0; i < numItems; i++) {
      portfolioItems.push({
        artistId: studio.id,
        title: `${faker.helpers.arrayElement(TATTOO_STYLES)} ${faker.helpers.arrayElement(studioTitles)}`,
        description: faker.lorem.paragraph(),
        media: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => ({
          publicId: faker.string.uuid(),
          url: `https://picsum.photos/seed/${faker.string.uuid()}/800/600`,
          type: "image",
          width: 800,
          height: 600,
        })),
        categories: faker.helpers.arrayElements(TATTOO_STYLES, faker.number.int({ min: 2, max: 4 })),
        sortOrder: i,
      });
    }
  }
  
  // Create portfolio items for ENTHUSIASTS (3-8 items each - their personal tattoo collection)
  const enthusiasts = users.filter(u => u.role === "ENTHUSIAST");
  for (const enthusiast of enthusiasts) {
    const numItems = faker.number.int({ min: 3, max: 8 });
    
    for (let i = 0; i < numItems; i++) {
      portfolioItems.push({
        artistId: enthusiast.id,
        title: faker.helpers.arrayElement(enthusiastTitles),
        description: faker.helpers.arrayElement([
          "Got this done at an amazing studio downtown!",
          "Took 6 hours but totally worth it.",
          "My first tattoo - still love it!",
          "Dedicated to my family.",
          "This piece has a special meaning to me.",
          faker.lorem.sentence(),
        ]),
        media: Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => ({
          publicId: faker.string.uuid(),
          url: `https://picsum.photos/seed/${faker.string.uuid()}/800/600`,
          type: "image",
          width: 800,
          height: 600,
        })),
        categories: faker.helpers.arrayElements(TATTOO_STYLES, faker.number.int({ min: 1, max: 2 })),
        sortOrder: i,
      });
    }
  }
  
  await db.insert(schema.portfolioItems).values(portfolioItems);
  console.log(`✅ Created ${portfolioItems.length} portfolio items (Artists: ${artists.length * 15}, Studios: ${studios.length * 20}, Enthusiasts: ${enthusiasts.length * 5})`);
}

async function seedJobsAndApplications(users: typeof schema.users.$inferSelect[]) {
  console.log("💼 Creating job postings and applications...");
  
  const studios = users.filter(u => u.role === "STUDIO" && u.isVerified);
  const artists = users.filter(u => u.role === "ARTIST");
  const jobs: typeof schema.jobPostings.$inferInsert[] = [];
  
  for (const studio of studios) {
    const numJobs = faker.number.int({ min: 3, max: 10 });
    
    for (let i = 0; i < numJobs; i++) {
      jobs.push({
        studioId: studio.id,
        title: `${faker.helpers.arrayElement(TATTOO_STYLES)} Tattoo Artist`,
        type: faker.helpers.arrayElement(["FULL_TIME", "PART_TIME", "CONTRACT", "APPRENTICESHIP"]) as any,
        description: faker.lorem.paragraphs(3),
        location: `${studio.location?.city}, ${studio.location?.country}`,
        isActive: faker.datatype.boolean(0.8),
        salaryMinCents: faker.number.int({ min: 40000_00, max: 60000_00 }),
        salaryMaxCents: faker.number.int({ min: 60000_00, max: 100000_00 }),
      });
    }
  }
  
  const insertedJobs = await db.insert(schema.jobPostings).values(jobs).returning();
  console.log(`✅ Created ${insertedJobs.length} job postings`);
  
  // Create applications
  const applications: typeof schema.jobApplications.$inferInsert[] = [];
  for (const job of insertedJobs.filter(j => j.isActive)) {
    const numApplications = faker.number.int({ min: 2, max: 10 });
    const applicants = faker.helpers.arrayElements(artists, Math.min(numApplications, artists.length));
    
    for (const applicant of applicants) {
      applications.push({
        jobId: job.id,
        artistId: applicant.id,
        coverLetter: faker.lorem.paragraphs(2),
        status: faker.helpers.arrayElement(["SUBMITTED", "REVIEWING", "ACCEPTED", "REJECTED"]) as any,
      });
    }
  }
  
  await db.insert(schema.jobApplications).values(applications);
  console.log(`✅ Created ${applications.length} job applications`);
}

async function seedStudioConnections(users: typeof schema.users.$inferSelect[]) {
  console.log("🤝 Creating studio-artist connections...");
  
  const studios = users.filter(u => u.role === "STUDIO" && u.isVerified);
  const artists = users.filter(u => u.role === "ARTIST" && u.isVerified);
  const requests: typeof schema.studioApprovalRequests.$inferInsert[] = [];
  
  for (const artist of artists.slice(0, 20)) {
    const numRequests = faker.number.int({ min: 1, max: 3 });
    const selectedStudios = faker.helpers.arrayElements(studios, numRequests);
    
    for (const studio of selectedStudios) {
      requests.push({
        studioId: studio.id,
        artistId: artist.id,
        status: faker.helpers.weightedArrayElement([
          { value: "APPROVED" as const, weight: 5 },
          { value: "PENDING" as const, weight: 3 },
          { value: "REJECTED" as const, weight: 1 },
        ]),
        note: faker.datatype.boolean(0.5) ? faker.lorem.sentence() : undefined,
      });
    }
  }
  
  await db.insert(schema.studioApprovalRequests).values(requests);
  console.log(`✅ Created ${requests.length} studio approval requests`);
}

async function seedMessaging(users: typeof schema.users.$inferSelect[]) {
  console.log("💬 Creating conversations and messages...");
  
  const conversations: typeof schema.conversations.$inferInsert[] = [];
  const numConversations = 30;
  
  for (let i = 0; i < numConversations; i++) {
    conversations.push({
      isGroup: false,
      lastMessageAt: faker.date.recent({ days: 30 }),
    });
  }
  
  const insertedConversations = await db.insert(schema.conversations).values(conversations).returning();
  console.log(`✅ Created ${insertedConversations.length} conversations`);
  
  // Add participants
  const participantRecords: typeof schema.conversationParticipants.$inferInsert[] = [];
  for (let i = 0; i < insertedConversations.length; i++) {
    const participants = faker.helpers.arrayElements(users, 2);
    
    for (const participant of participants) {
      participantRecords.push({
        conversationId: insertedConversations[i].id,
        userId: participant.id,
        lastReadAt: faker.date.recent({ days: 5 }),
      });
    }
  }
  
  await db.insert(schema.conversationParticipants).values(participantRecords);
  
  // Add messages to each conversation (10+ per conversation)
  const messages: typeof schema.messages.$inferInsert[] = [];
  const messageTexts = [
    "Hey, love your work!", "That tattoo looks amazing!", "Are you taking new clients?",
    "What's your availability like?", "Thanks for the follow!", "Your portfolio is incredible!",
    "Do you do custom designs?", "I'd love to book a consultation", "Amazing piece!",
    "How long have you been tattooing?"
  ];
  
  for (const conversation of insertedConversations) {
    const numMessages = faker.number.int({ min: 10, max: 30 });
    const convParticipants = participantRecords.filter(p => p.conversationId === conversation.id);
    
    for (let i = 0; i < numMessages; i++) {
      const sender = faker.helpers.arrayElement(convParticipants);
      
      messages.push({
        conversationId: conversation.id,
        senderId: sender.userId,
        body: faker.helpers.arrayElement(messageTexts),
        sentAt: faker.date.recent({ days: 30 }),
      });
    }
  }
  
  await db.insert(schema.messages).values(messages);
  console.log(`✅ Created ${messages.length} messages`);
}

async function seedLivestreams(users: typeof schema.users.$inferSelect[]) {
  console.log("📺 Creating livestream events...");
  
  const hosts = users.filter(u => (u.role === "ARTIST" || u.role === "STUDIO") && u.isVerified);
  const events: typeof schema.livestreamEvents.$inferInsert[] = [];
  
  for (const host of hosts.slice(0, 15)) {
    const numEvents = faker.number.int({ min: 2, max: 5 });
    
    for (let i = 0; i < numEvents; i++) {
      const status = faker.helpers.arrayElement(["SCHEDULED", "LIVE", "ENDED"]) as any;
      
      events.push({
        hostId: host.id,
        title: faker.helpers.arrayElement([
          "Live Tattoo Session",
          "Q&A with the Artist",
          "Studio Tour",
          "Technique Demo",
          "Client Consultation",
        ]),
        scheduledFor: faker.date.future(),
        startedAt: status !== "SCHEDULED" ? faker.date.past() : undefined,
        endedAt: status === "ENDED" ? faker.date.recent() : undefined,
        status,
        viewerPeak: status !== "SCHEDULED" ? faker.number.int({ min: 10, max: 500 }) : 0,
        viewerTotal: status !== "SCHEDULED" ? faker.number.int({ min: 20, max: 1000 }) : 0,
      });
    }
  }
  
  await db.insert(schema.livestreamEvents).values(events);
  console.log(`✅ Created ${events.length} livestream events`);
}

async function seedNotifications(users: typeof schema.users.$inferSelect[]) {
  console.log("🔔 Creating notifications...");
  
  const notifications: typeof schema.notifications.$inferInsert[] = [];
  
  for (const user of users.slice(0, 30)) {
    const numNotifications = faker.number.int({ min: 10, max: 30 });
    
    for (let i = 0; i < numNotifications; i++) {
      const type = faker.helpers.arrayElement(["FOLLOW", "LIKE", "COMMENT", "APPROVAL", "SYSTEM"]) as any;
      
      notifications.push({
        userId: user.id,
        type,
        payload: {
          message: faker.lorem.sentence(),
          actorId: faker.helpers.arrayElement(users).id,
        },
        isRead: faker.datatype.boolean(0.6),
      });
    }
  }
  
  await db.insert(schema.notifications).values(notifications);
  console.log(`✅ Created ${notifications.length} notifications`);
}

async function main() {
  console.log("\n🌱 INKTAGRAM DATABASE SEEDING\n");
  console.log("⚠️  WARNING: This will clear all existing data!\n");
  
  try {
    await clearDatabase();
    
    const users = await seedUsers();
    await seedProfiles(users);
    const hashtags = await seedHashtags();
    const posts = await seedPosts(users, hashtags);
    await seedSocialInteractions(users, posts);
    await seedPortfolio(users);
    await seedJobsAndApplications(users);
    await seedStudioConnections(users);
    await seedMessaging(users);
    await seedLivestreams(users);
    await seedNotifications(users);
    
    console.log("\n✅ SEEDING COMPLETE!\n");
    console.log("📊 Summary:");
    console.log(`   - ${users.length} users created (1 admin, 15 studios, 30 artists, 20 enthusiasts)`);
    console.log(`   - ${posts.length} posts and reels created`);
    console.log(`   - Every user has 10+ items across all relevant features`);
    console.log(`   - Social interactions (likes, comments, follows) added`);
    console.log(`   - Portfolio items, jobs, messages, livestreams included\n`);
    console.log("🔑 Test Credentials:");
    console.log("   - Admin: admin@inktagram.com / Test1234!");
    console.log("   - Studio: studio1@inktagram.com / Test1234!");
    console.log("   - Artist: artist1@inktagram.com / Test1234!");
    console.log("   - Enthusiast: enthusiast1@inktagram.com / Test1234!\n");
    
  } catch (error) {
    console.error("\n❌ Error during seeding:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
