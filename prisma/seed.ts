import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";

const db = new PrismaClient();

async function main() {
  console.log("Seeding VoteWise...");

  // ---- Platform admin ----
  const adminPass = await hashPassword("platform123");
  const platformOrg = await db.organization.upsert({
    where: { subdomain: "platform" },
    update: {},
    create: { name: "VoteWise Platform", subdomain: "platform", category: "GOVERNMENT", status: "ACTIVE", plan: "ENTERPRISE" },
  });
  await db.organizationMember.upsert({
    where: { organizationId_email: { organizationId: platformOrg.id, email: "admin@votewise.app" } },
    update: {},
    create: {
      organizationId: platformOrg.id,
      email: "admin@votewise.app",
      name: "Platform Admin",
      passwordHash: adminPass,
      role: "PLATFORM_ADMIN",
      status: "ACTIVE",
    },
  });

  // ---- Org 1: Achema State University ----
  const org1Pass = await hashPassword("owner123");
  const org1 = await db.organization.upsert({
    where: { subdomain: "achema" },
    update: {},
    create: {
      name: "Achema State University",
      subdomain: "achema",
      category: "UNIVERSITY",
      status: "ACTIVE",
      plan: "ENTERPRISE",
    },
  });
  await db.organizationBrand.upsert({
    where: { organizationId: org1.id },
    update: {},
    create: { organizationId: org1.id, tagline: "Students' Union Government — transparent elections." },
  });
  const org1Owner = await db.organizationMember.upsert({
    where: { organizationId_email: { organizationId: org1.id, email: "owner@achema.edu" } },
    update: {},
    create: {
      organizationId: org1.id,
      email: "owner@achema.edu",
      name: "Dr. Adaeze Nwosu",
      passwordHash: org1Pass,
      role: "ORG_OWNER",
      status: "ACTIVE",
    },
  });

  // ---- Observer member ----
  await db.organizationMember.upsert({
    where: { organizationId_email: { organizationId: org1.id, email: "observer@achema.edu" } },
    update: {},
    create: {
      organizationId: org1.id,
      email: "observer@achema.edu",
      name: "Prof. Ibrahim Saleh",
      passwordHash: org1Pass, // same password for demo
      role: "OBSERVER",
      status: "ACTIVE",
    },
  });

  // ---- Live election: SUG 2025 ----
  const startLive = new Date(Date.now() - 60 * 60_000); // 1h ago
  const endLive = new Date(Date.now() + 5 * 60 * 60_000); // 5h from now
  const liveElection = await db.election.upsert({
    where: { id: "election-sug-2025" },
    update: { startTime: startLive, endTime: endLive, status: "LIVE" },
    create: {
      id: "election-sug-2025",
      organizationId: org1.id,
      name: "SUG General Elections 2025",
      description: "Students' Union Government presidential and vice-presidential election.",
      status: "LIVE",
      visibility: "PUBLIC",
      startTime: startLive,
      endTime: endLive,
      showLiveResults: true,
      hideResultsUntilEnd: false,
      requireAccreditation: false,
      notaEnabled: true,
      ballotRandomization: true,
    },
  });

  const presPos = await db.position.upsert({
    where: { id: "pos-president" },
    update: {},
    create: { id: "pos-president", electionId: liveElection.id, title: "President", description: "Head of the Students' Union Government", maxVotes: 1, displayOrder: 0 },
  });
  const vpPos = await db.position.upsert({
    where: { id: "pos-vp" },
    update: {},
    create: { id: "pos-vp", electionId: liveElection.id, title: "Vice President", description: "Deputy head of the SUG", maxVotes: 1, displayOrder: 1 },
  });

  const candidates = [
    { id: "cand-amina", pos: presPos.id, name: "Amina Bello", slogan: "Progress Together", bio: "Final-year Law student. Former hall rep." },
    { id: "cand-tunde", pos: presPos.id, name: "Tunde Okafor", slogan: "Voice of the Students", bio: "Engineering, 400 level. Debate society lead." },
    { id: "cand-grace", pos: presPos.id, name: "Grace Eze", slogan: "Action, Not Promises", bio: "Medicine, 500 level. Volunteer coordinator." },
    { id: "cand-sani", pos: vpPos.id, name: "Sani Musa", slogan: "Service First", bio: "Accounting, 300 level." },
    { id: "cand-funmi", pos: vpPos.id, name: "Funmi Adewale", slogan: "Stronger Together", bio: "Mass Comm, 400 level." },
  ];
  for (const c of candidates) {
    await db.candidate.upsert({
      where: { id: c.id },
      update: {},
      create: { id: c.id, positionId: c.pos, name: c.name, slogan: c.slogan, bio: c.bio, status: "APPROVED", screeningStatus: "APPROVED" },
    });
  }

  // ---- Voters ----
  const voterNames = [
    "Chidi Okeke", "Ngozi Umeh", "Ibrahim Sule", "Blessing Eze", "Yusuf Aliyu",
    "Hauwa Lawal", "Emeka Obi", "Zainab Mohammed", "Kunle Adeyemi", "Aisha Bello",
    "Daniel Ojo", "Fatima Ibrahim", "Samuel Eze", "Maryam Abubakar", "Oluwaseun Ojo",
  ];
  let i = 0;
  for (const name of voterNames) {
    const identifier = `VOT/${String(2025000 + i).padStart(6, "0")}`;
    const voter = await db.voter.upsert({
      where: { organizationId_identifier: { organizationId: org1.id, identifier } },
      update: {},
      create: {
        organizationId: org1.id,
        identifier,
        fullName: name,
        email: `voter${i}@achema.edu`,
        phone: null,
      },
    });
    await db.voterEligibility.upsert({
      where: { electionId_voterId: { electionId: liveElection.id, voterId: voter.id } },
      update: {},
      create: { electionId: liveElection.id, voterId: voter.id },
    });
    i++;
  }

  // seed a few tallies so live results aren't empty
  const tallySeed = [
    { cand: "cand-amina", count: 4 }, { cand: "cand-tunde", count: 3 }, { cand: "cand-grace", count: 2 },
    { cand: "cand-sani", count: 5 }, { cand: "cand-funmi", count: 4 },
  ];
  for (const t of tallySeed) {
    const cand = await db.candidate.findUnique({ where: { id: t.cand } });
    if (cand) {
      await db.candidateTally.upsert({
        where: { electionId_positionId_candidateId: { electionId: liveElection.id, positionId: cand.positionId, candidateId: cand.id } },
        update: { count: t.count },
        create: { electionId: liveElection.id, positionId: cand.positionId, candidateId: cand.id, count: t.count },
      });
    }
  }

  // ---- Scheduled election ----
  const schedStart = new Date(Date.now() + 2 * 24 * 60 * 60_000);
  const schedEnd = new Date(schedStart.getTime() + 6 * 60 * 60_000);
  const schedElection = await db.election.upsert({
    where: { id: "election-faculty-2025" },
    update: {},
    create: {
      id: "election-faculty-2025",
      organizationId: org1.id,
      name: "Faculty of Science Elections 2025",
      description: "Faculty representative election.",
      status: "SCHEDULED",
      visibility: "PUBLIC",
      startTime: schedStart,
      endTime: schedEnd,
    },
  });
  const sciPres = await db.position.upsert({
    where: { id: "pos-sci-pres" },
    update: {},
    create: { id: "pos-sci-pres", electionId: schedElection.id, title: "Faculty Representative", maxVotes: 1, displayOrder: 0 },
  });
  await db.candidate.upsert({
    where: { id: "cand-david" },
    update: {},
    create: { id: "cand-david", positionId: sciPres.id, name: "David Okon", slogan: "Science for All", status: "APPROVED", screeningStatus: "APPROVED" },
  });
  await db.candidate.upsert({
    where: { id: "cand-ruth" },
    update: {},
    create: { id: "cand-ruth", positionId: sciPres.id, name: "Ruth Adebayo", slogan: "Innovation First", status: "APPROVED", screeningStatus: "APPROVED" },
  });

  // ---- Org 2: CoopLine Cooperative ----
  const org2 = await db.organization.upsert({
    where: { subdomain: "coopline" },
    update: {},
    create: { name: "CoopLine Cooperative", subdomain: "coopline", category: "COOPERATIVE", status: "ACTIVE", plan: "PAYG" },
  });
  await db.organizationBrand.upsert({
    where: { organizationId: org2.id },
    update: {},
    create: { organizationId: org2.id, tagline: "Member-owned. Member-governed." },
  });

  console.log("Seed complete.");
  console.log("  Platform admin: admin@votewise.app / platform123");
  console.log("  Org owner:      owner@achema.edu / owner123");
  console.log("  Observer:       observer@achema.edu / owner123");
  console.log("  Voter identifier: VOT/2025000 .. VOT/2025014 (OTP shown in dev)");
  console.log("  Live election: election-sug-2025");
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    db.$disconnect();
    process.exit(1);
  });
