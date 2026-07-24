-- CreateTable
CREATE TABLE "DocumentInvite" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "permission" "SharePermission" NOT NULL DEFAULT 'EDIT',
    "invitedById" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentInvite_token_key" ON "DocumentInvite"("token");

-- CreateIndex
CREATE INDEX "DocumentInvite_email_idx" ON "DocumentInvite"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentInvite_documentId_email_key" ON "DocumentInvite"("documentId", "email");

-- AddForeignKey
ALTER TABLE "DocumentInvite" ADD CONSTRAINT "DocumentInvite_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentInvite" ADD CONSTRAINT "DocumentInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
