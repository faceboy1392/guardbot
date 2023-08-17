-- CreateEnum
CREATE TYPE "MemberEventType" AS ENUM ('JOIN', 'LEAVE', 'SELF_NICKNAME', 'MOD_NICKNAME', 'ROLE_ADD', 'ROLE_REMOVE', 'CREATE_INVITE', 'AUTOMOD', 'INFRACTION');

-- CreateEnum
CREATE TYPE "InfractionType" AS ENUM ('NOTICE', 'DETAIN', 'WARN', 'MUTE', 'KICK', 'HARDKICK', 'TEMPBAN', 'BAN');

-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL DEFAULT 'Bob',
    "logChannelId" TEXT,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "guildId" TEXT,
    "rank" TEXT NOT NULL,
    "perms" JSONB NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "guildId" TEXT,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" VARCHAR(32) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildMember" (
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "roles" TEXT[],

    CONSTRAINT "GuildMember_pkey" PRIMARY KEY ("userId","guildId")
);

-- CreateTable
CREATE TABLE "MemberEvent" (
    "id" TEXT NOT NULL,
    "guildMemberUserId" TEXT,
    "guildMemberGuildId" TEXT,
    "type" "MemberEventType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "infractionId" TEXT NOT NULL,
    "customData" JSONB,

    CONSTRAINT "MemberEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Infraction" (
    "id" TEXT NOT NULL,
    "guildMemberUserId" TEXT,
    "guildMemberGuildId" TEXT,
    "type" "InfractionType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "customData" JSONB,
    "resolved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Infraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Guild_id_key" ON "Guild"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Role_id_key" ON "Role"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Channel_id_key" ON "Channel"("id");

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");

-- CreateIndex
CREATE UNIQUE INDEX "MemberEvent_infractionId_key" ON "MemberEvent"("infractionId");

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMember" ADD CONSTRAINT "GuildMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMember" ADD CONSTRAINT "GuildMember_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberEvent" ADD CONSTRAINT "MemberEvent_guildMemberUserId_guildMemberGuildId_fkey" FOREIGN KEY ("guildMemberUserId", "guildMemberGuildId") REFERENCES "GuildMember"("userId", "guildId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberEvent" ADD CONSTRAINT "MemberEvent_infractionId_fkey" FOREIGN KEY ("infractionId") REFERENCES "Infraction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Infraction" ADD CONSTRAINT "Infraction_guildMemberUserId_guildMemberGuildId_fkey" FOREIGN KEY ("guildMemberUserId", "guildMemberGuildId") REFERENCES "GuildMember"("userId", "guildId") ON DELETE SET NULL ON UPDATE CASCADE;
