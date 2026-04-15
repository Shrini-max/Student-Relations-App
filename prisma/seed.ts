import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@paradox.local";
  const adminPass = "admin123";
  const headEmail = "head@paradox.local";
  const headPass = "head123";
  const viewerEmail = "viewer@paradox.local";
  const viewerPass = "viewer123";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Paradox Admin",
      passwordHash: await bcrypt.hash(adminPass, 10),
      role: "ADMIN",
    },
  });

  const head = await prisma.user.upsert({
    where: { email: headEmail },
    update: {},
    create: {
      email: headEmail,
      name: "Tech Dept Head",
      passwordHash: await bcrypt.hash(headPass, 10),
      role: "DEPT_HEAD",
    },
  });

  await prisma.user.upsert({
    where: { email: viewerEmail },
    update: {},
    create: {
      email: viewerEmail,
      name: "Read Only Viewer",
      passwordHash: await bcrypt.hash(viewerPass, 10),
      role: "VIEWER",
    },
  });

  const tech = await prisma.department.upsert({
    where: { name: "Technology" },
    update: {},
    create: {
      name: "Technology",
      description: "Platform, web, and infra for Paradox.",
      headId: head.id,
    },
  });

  const design = await prisma.department.upsert({
    where: { name: "Design" },
    update: {},
    create: {
      name: "Design",
      description: "Branding, stage, and digital design.",
    },
  });

  await prisma.department.upsert({
    where: { name: "Public Relations" },
    update: {},
    create: {
      name: "Public Relations",
      description: "Outreach, sponsorships, and media.",
    },
  });

  // Global role types
  const globalRoles = [
    { name: "Coordinator", description: "Coordinates the team." },
    { name: "Volunteer", description: "General volunteer." },
    { name: "Lead", description: "Team lead." },
  ];
  for (const r of globalRoles) {
    await prisma.roleType.upsert({
      where: { name_departmentId: { name: r.name, departmentId: null as any } },
      update: {},
      create: { name: r.name, description: r.description, scope: "GLOBAL" },
    }).catch(async () => {
      // SQLite unique with null: fallback check
      const existing = await prisma.roleType.findFirst({
        where: { name: r.name, departmentId: null },
      });
      if (!existing) {
        await prisma.roleType.create({
          data: { name: r.name, description: r.description, scope: "GLOBAL" },
        });
      }
    });
  }

  // Dept-specific roles
  const techRoles = ["Backend", "Frontend", "DevOps"];
  for (const name of techRoles) {
    const existing = await prisma.roleType.findFirst({
      where: { name, departmentId: tech.id },
    });
    if (!existing) {
      await prisma.roleType.create({
        data: { name, scope: "DEPARTMENT", departmentId: tech.id },
      });
    }
  }

  const designRoles = ["Graphic Designer", "Illustrator"];
  for (const name of designRoles) {
    const existing = await prisma.roleType.findFirst({
      where: { name, departmentId: design.id },
    });
    if (!existing) {
      await prisma.roleType.create({
        data: { name, scope: "DEPARTMENT", departmentId: design.id },
      });
    }
  }

  // Sample team and members
  const webTeam = await prisma.team.upsert({
    where: { departmentId_name: { departmentId: tech.id, name: "Web Team" } },
    update: {},
    create: {
      name: "Web Team",
      description: "The Paradox web platform.",
      departmentId: tech.id,
    },
  });

  const lead = await prisma.roleType.findFirst({
    where: { name: "Lead", departmentId: null },
  });
  const frontend = await prisma.roleType.findFirst({
    where: { name: "Frontend", departmentId: tech.id },
  });

  const memberData = [
    { name: "Aarav Shah", email: "aarav@paradox.local", phone: "+91 90000 11111", roleTypeId: lead?.id },
    { name: "Divya Menon", email: "divya@paradox.local", phone: null, roleTypeId: frontend?.id },
    { name: "Karthik Rao", email: "karthik@paradox.local", phone: null, roleTypeId: frontend?.id },
  ];
  for (const m of memberData) {
    const exists = await prisma.member.findFirst({
      where: { email: m.email, teamId: webTeam.id },
    });
    if (!exists) {
      await prisma.member.create({
        data: {
          name: m.name,
          email: m.email,
          phone: m.phone ?? undefined,
          teamId: webTeam.id,
          roleTypeId: m.roleTypeId ?? undefined,
        },
      });
    }
  }

  console.log("Seeded. Logins:");
  console.log(`  ADMIN:     ${adminEmail} / ${adminPass}`);
  console.log(`  DEPT_HEAD: ${headEmail} / ${headPass} (heads Technology)`);
  console.log(`  VIEWER:    ${viewerEmail} / ${viewerPass}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
