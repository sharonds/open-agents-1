import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "./client";
import { teamInvitations, teamMembers, teams } from "./schema";

const PERSONAL_TEAM_ID_PREFIX = "personal_";
const COLLABORATION_TEAM_ID_PREFIX = "team_";

function toPersonalTeamId(userId: string): string {
  return `${PERSONAL_TEAM_ID_PREFIX}${userId}`;
}

function toCollaborationTeamId(): string {
  return `${COLLABORATION_TEAM_ID_PREFIX}${nanoid(12)}`;
}

function toPersonalTeamName(username: string): string {
  const trimmedUsername = username.trim();
  if (!trimmedUsername) {
    return "My Team";
  }

  return `${trimmedUsername}'s Team`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

type TeamInvitationStatus = "pending" | "accepted" | "declined" | "revoked";

export async function getPersonalTeamForUser(userId: string) {
  return db.query.teams.findFirst({
    where: eq(teams.personalOwnerUserId, userId),
  });
}

export async function ensurePersonalTeamForUser(input: {
  userId: string;
  username: string;
}) {
  const now = new Date();
  const teamId = toPersonalTeamId(input.userId);

  await db
    .insert(teams)
    .values({
      id: teamId,
      name: toPersonalTeamName(input.username),
      personalOwnerUserId: input.userId,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: teams.id,
      set: {
        personalOwnerUserId: input.userId,
        updatedAt: now,
      },
    });

  await db
    .insert(teamMembers)
    .values({
      teamId,
      userId: input.userId,
      role: "owner",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [teamMembers.teamId, teamMembers.userId],
      set: {
        role: "owner",
        updatedAt: now,
      },
    });

  const personalTeam = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
  });

  if (!personalTeam) {
    throw new Error("Failed to ensure personal team");
  }

  return personalTeam;
}

export async function getTeamById(teamId: string) {
  return db.query.teams.findFirst({
    where: eq(teams.id, teamId),
  });
}

export async function getTeamMembership(userId: string, teamId: string) {
  return db.query.teamMembers.findFirst({
    where: and(eq(teamMembers.userId, userId), eq(teamMembers.teamId, teamId)),
    columns: {
      teamId: true,
      userId: true,
      role: true,
    },
  });
}

export async function createTeamForUser(input: {
  ownerUserId: string;
  name: string;
}) {
  return db.transaction(async (tx) => {
    const now = new Date();
    const teamId = toCollaborationTeamId();

    const [createdTeam] = await tx
      .insert(teams)
      .values({
        id: teamId,
        name: input.name,
        personalOwnerUserId: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!createdTeam) {
      throw new Error("Failed to create team");
    }

    await tx.insert(teamMembers).values({
      teamId,
      userId: input.ownerUserId,
      role: "owner",
      createdAt: now,
      updatedAt: now,
    });

    return createdTeam;
  });
}

type AddUserToTeamResult = {
  membership: {
    teamId: string;
    userId: string;
    role: "owner" | "member";
  };
  created: boolean;
};

export async function addUserToTeam(input: {
  teamId: string;
  userId: string;
  role?: "owner" | "member";
}): Promise<AddUserToTeamResult> {
  const now = new Date();
  const [insertedMembership] = await db
    .insert(teamMembers)
    .values({
      teamId: input.teamId,
      userId: input.userId,
      role: input.role ?? "member",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: [teamMembers.teamId, teamMembers.userId] })
    .returning({
      teamId: teamMembers.teamId,
      userId: teamMembers.userId,
      role: teamMembers.role,
    });

  if (insertedMembership) {
    return { membership: insertedMembership, created: true };
  }

  const existingMembership = await getTeamMembership(
    input.userId,
    input.teamId,
  );
  if (!existingMembership) {
    throw new Error("Failed to add team member");
  }

  return {
    membership: existingMembership,
    created: false,
  };
}

type CreateTeamInvitationResult = {
  invitation: {
    id: string;
    teamId: string;
    email: string;
    role: "owner" | "member";
    status: TeamInvitationStatus;
    createdAt: Date;
    updatedAt: Date;
  };
  created: boolean;
};

export async function createTeamInvitation(input: {
  teamId: string;
  email: string;
  invitedByUserId: string;
  role?: "owner" | "member";
}): Promise<CreateTeamInvitationResult> {
  const normalizedEmail = normalizeEmail(input.email);
  const now = new Date();

  const existingInvitation = await db.query.teamInvitations.findFirst({
    where: and(
      eq(teamInvitations.teamId, input.teamId),
      eq(teamInvitations.email, normalizedEmail),
      eq(teamInvitations.status, "pending"),
    ),
    columns: {
      id: true,
      teamId: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (existingInvitation) {
    const [updatedInvitation] = await db
      .update(teamInvitations)
      .set({
        invitedByUserId: input.invitedByUserId,
        role: input.role ?? existingInvitation.role,
        updatedAt: now,
      })
      .where(eq(teamInvitations.id, existingInvitation.id))
      .returning({
        id: teamInvitations.id,
        teamId: teamInvitations.teamId,
        email: teamInvitations.email,
        role: teamInvitations.role,
        status: teamInvitations.status,
        createdAt: teamInvitations.createdAt,
        updatedAt: teamInvitations.updatedAt,
      });

    if (!updatedInvitation) {
      throw new Error("Failed to update team invitation");
    }

    return {
      invitation: updatedInvitation,
      created: false,
    };
  }

  const [createdInvitation] = await db
    .insert(teamInvitations)
    .values({
      id: nanoid(),
      teamId: input.teamId,
      email: normalizedEmail,
      role: input.role ?? "member",
      invitedByUserId: input.invitedByUserId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: teamInvitations.id,
      teamId: teamInvitations.teamId,
      email: teamInvitations.email,
      role: teamInvitations.role,
      status: teamInvitations.status,
      createdAt: teamInvitations.createdAt,
      updatedAt: teamInvitations.updatedAt,
    });

  if (!createdInvitation) {
    throw new Error("Failed to create team invitation");
  }

  return {
    invitation: createdInvitation,
    created: true,
  };
}

export async function listPendingTeamInvitationsForEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);

  const invitations = await db
    .select({
      id: teamInvitations.id,
      teamId: teamInvitations.teamId,
      teamName: teams.name,
      role: teamInvitations.role,
      invitedByUserId: teamInvitations.invitedByUserId,
      createdAt: teamInvitations.createdAt,
      updatedAt: teamInvitations.updatedAt,
    })
    .from(teamInvitations)
    .innerJoin(teams, eq(teamInvitations.teamId, teams.id))
    .where(
      and(
        eq(teamInvitations.email, normalizedEmail),
        eq(teamInvitations.status, "pending"),
      ),
    )
    .orderBy(desc(teamInvitations.createdAt));

  return invitations;
}

export async function getPendingTeamInvitationForEmailById(
  invitationId: string,
  email: string,
) {
  const normalizedEmail = normalizeEmail(email);

  const [invitation] = await db
    .select({
      id: teamInvitations.id,
      teamId: teamInvitations.teamId,
      teamName: teams.name,
      email: teamInvitations.email,
      role: teamInvitations.role,
      status: teamInvitations.status,
      invitedByUserId: teamInvitations.invitedByUserId,
      createdAt: teamInvitations.createdAt,
      updatedAt: teamInvitations.updatedAt,
    })
    .from(teamInvitations)
    .innerJoin(teams, eq(teamInvitations.teamId, teams.id))
    .where(
      and(
        eq(teamInvitations.id, invitationId),
        eq(teamInvitations.email, normalizedEmail),
        eq(teamInvitations.status, "pending"),
      ),
    )
    .limit(1);

  return invitation ?? null;
}

export async function updateTeamInvitationStatus(input: {
  invitationId: string;
  status: Exclude<TeamInvitationStatus, "pending">;
}) {
  const now = new Date();
  const [invitation] = await db
    .update(teamInvitations)
    .set({
      status: input.status,
      respondedAt: now,
      updatedAt: now,
    })
    .where(eq(teamInvitations.id, input.invitationId))
    .returning({
      id: teamInvitations.id,
      teamId: teamInvitations.teamId,
      email: teamInvitations.email,
      role: teamInvitations.role,
      status: teamInvitations.status,
      createdAt: teamInvitations.createdAt,
      updatedAt: teamInvitations.updatedAt,
      respondedAt: teamInvitations.respondedAt,
    });

  return invitation ?? null;
}

export async function isUserMemberOfTeam(
  userId: string,
  teamId: string,
): Promise<boolean> {
  const membership = await db.query.teamMembers.findFirst({
    where: and(eq(teamMembers.userId, userId), eq(teamMembers.teamId, teamId)),
    columns: {
      userId: true,
    },
  });

  return Boolean(membership);
}

export async function listTeamsForUser(userId: string): Promise<
  Array<{
    id: string;
    name: string;
    role: "owner" | "member";
    isPersonal: boolean;
  }>
> {
  const rows = await db
    .select({
      id: teams.id,
      name: teams.name,
      role: teamMembers.role,
      personalOwnerUserId: teams.personalOwnerUserId,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(teamMembers.userId, userId));

  return rows
    .map((row) => ({
      id: row.id,
      name: row.name,
      role: row.role,
      isPersonal: row.personalOwnerUserId === userId,
    }))
    .toSorted((a, b) => {
      if (a.isPersonal && !b.isPersonal) {
        return -1;
      }
      if (!a.isPersonal && b.isPersonal) {
        return 1;
      }
      return a.name.localeCompare(b.name);
    });
}

export async function resolveActiveTeamIdForUser(input: {
  userId: string;
  username: string;
  preferredTeamId?: string | null;
}): Promise<string> {
  const personalTeam = await ensurePersonalTeamForUser({
    userId: input.userId,
    username: input.username,
  });

  if (input.preferredTeamId) {
    const hasMembership = await isUserMemberOfTeam(
      input.userId,
      input.preferredTeamId,
    );
    if (hasMembership) {
      return input.preferredTeamId;
    }
  }

  return personalTeam.id;
}
