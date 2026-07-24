import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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

  await prisma.documentShare.upsert({
    where: { documentId_userId: { documentId: welcomeDoc.id, userId: bob.id } },
    update: {},
    create: { documentId: welcomeDoc.id, userId: bob.id, permission: "VIEW" },
  });

  console.log("Seeded users: alice@ajaia.dev / bob@ajaia.dev (password: demo1234)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
