import { PrismaClient, type SharePermission } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** Builds a simple TipTap doc: an H1 title followed by paragraphs. */
function doc(title: string, paragraphs: string[]) {
  return {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: title }] },
      ...paragraphs.map((text) => ({
        type: "paragraph",
        content: [{ type: "text", text }],
      })),
    ],
  };
}

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const alice = await prisma.user.upsert({
    where: { email: "alice@ajaia.dev" },
    update: {},
    create: { name: "Alice", email: "alice@ajaia.dev", passwordHash },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@ajaia.dev" },
    update: {},
    create: { name: "Bob", email: "bob@ajaia.dev", passwordHash },
  });

  const welcomeDoc = await prisma.document.upsert({
    where: { id: "seed-welcome-doc" },
    update: {},
    create: {
      id: "seed-welcome-doc",
      title: "Welcome to Ajaia Docs",
      ownerId: alice.id,
      contentJson: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Welcome to Ajaia Docs" }] },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "This document is owned by " },
              { type: "text", text: "Alice", marks: [{ type: "bold" }] },
              { type: "text", text: " and shared with " },
              { type: "text", text: "Bob", marks: [{ type: "bold" }] },
              { type: "text", text: " as a viewer." },
            ],
          },
          {
            type: "bulletList",
            content: [
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Bold, italic, and underline formatting" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Headings and lists" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Autosave as you type" }] }] },
            ],
          },
        ],
      },
    },
  });

  // A set of documents shared in both directions between Alice and Bob.
  const seedDocs: Array<{
    id: string;
    title: string;
    owner: typeof alice;
    sharedWith: typeof bob;
    permission: SharePermission;
    paragraphs: string[];
  }> = [
    {
      id: "seed-roadmap-doc",
      title: "Q3 Product Roadmap",
      owner: alice,
      sharedWith: bob,
      permission: "EDIT",
      paragraphs: [
        "Alice drafted the roadmap and shared it with Bob so he can add engineering estimates.",
        "Key themes this quarter: collaboration, notifications, and export.",
      ],
    },
    {
      id: "seed-meeting-notes-doc",
      title: "Weekly Sync — Meeting Notes",
      owner: alice,
      sharedWith: bob,
      permission: "COMMENT",
      paragraphs: [
        "Running notes from the weekly team sync.",
        "Bob can leave comments but not edit the notes directly.",
      ],
    },
    {
      id: "seed-launch-plan-doc",
      title: "Launch Plan",
      owner: bob,
      sharedWith: alice,
      permission: "EDIT",
      paragraphs: [
        "Bob owns the launch plan and shared it with Alice for co-editing.",
        "Includes the timeline, owners, and go/no-go checklist.",
      ],
    },
    {
      id: "seed-design-review-doc",
      title: "Design Review Feedback",
      owner: bob,
      sharedWith: alice,
      permission: "VIEW",
      paragraphs: [
        "Bob's notes from the latest design review.",
        "Shared with Alice as read-only for reference.",
      ],
    },
  ];

  for (const d of seedDocs) {
    await prisma.document.upsert({
      where: { id: d.id },
      update: {},
      create: {
        id: d.id,
        title: d.title,
        ownerId: d.owner.id,
        contentJson: doc(d.title, d.paragraphs),
      },
    });

    await prisma.documentShare.upsert({
      where: { documentId_userId: { documentId: d.id, userId: d.sharedWith.id } },
      update: { permission: d.permission },
      create: { documentId: d.id, userId: d.sharedWith.id, permission: d.permission },
    });
  }

  await prisma.documentShare.upsert({
    where: { documentId_userId: { documentId: welcomeDoc.id, userId: bob.id } },
    update: {},
    create: { documentId: welcomeDoc.id, userId: bob.id, permission: "VIEW" },
  });

  // Seed in-app notifications so the bell has something to show on first login.
  // Reset seeded notifications first so re-running the seed stays idempotent.
  await prisma.notification.deleteMany({ where: { id: { startsWith: "seed-notif-" } } });

  const verb: Record<SharePermission, string> = {
    EDIT: "edit",
    COMMENT: "comment on",
    VIEW: "view",
  };

  await prisma.notification.createMany({
    data: [
      // Bob's notifications (docs Alice shared with him) — one unread.
      {
        id: "seed-notif-bob-welcome",
        userId: bob.id,
        actorName: "Alice",
        documentId: welcomeDoc.id,
        message: `shared “Welcome to Ajaia Docs” with you — you can ${verb.VIEW} it.`,
        read: true,
      },
      {
        id: "seed-notif-bob-roadmap",
        userId: bob.id,
        actorName: "Alice",
        documentId: "seed-roadmap-doc",
        message: `shared “Q3 Product Roadmap” with you — you can ${verb.EDIT} it.`,
        read: false,
      },
      {
        id: "seed-notif-bob-notes",
        userId: bob.id,
        actorName: "Alice",
        documentId: "seed-meeting-notes-doc",
        message: `shared “Weekly Sync — Meeting Notes” with you — you can ${verb.COMMENT} it.`,
        read: false,
      },
      // Alice's notifications (docs Bob shared with her) — both unread.
      {
        id: "seed-notif-alice-launch",
        userId: alice.id,
        actorName: "Bob",
        documentId: "seed-launch-plan-doc",
        message: `shared “Launch Plan” with you — you can ${verb.EDIT} it.`,
        read: false,
      },
      {
        id: "seed-notif-alice-design",
        userId: alice.id,
        actorName: "Bob",
        documentId: "seed-design-review-doc",
        message: `shared “Design Review Feedback” with you — you can ${verb.VIEW} it.`,
        read: false,
      },
    ],
  });

  console.log("Seeded users: alice@ajaia.dev / bob@ajaia.dev (password: demo1234)");
  console.log("Seeded shared documents (both directions) and in-app notifications.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
