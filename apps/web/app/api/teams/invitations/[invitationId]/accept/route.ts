import { cookies } from "next/headers";
import {
  addUserToTeam,
  getPendingTeamInvitationForEmailById,
  listTeamsForUser,
  updateTeamInvitationStatus,
} from "@/lib/db/teams";
import { encryptJWE } from "@/lib/jwe/encrypt";
import { SESSION_COOKIE_NAME } from "@/lib/session/constants";
import { getServerSession } from "@/lib/session/get-server-session";

const SESSION_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

type RouteContext = {
  params: Promise<{ invitationId: string }>;
};

export async function POST(_req: Request, context: RouteContext) {
  const session = await getServerSession();
  if (!session?.user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const email = session.user.email?.trim();
  if (!email) {
    return Response.json(
      {
        error:
          "Your account does not have an email address. Add one before accepting invitations.",
      },
      { status: 400 },
    );
  }

  const { invitationId } = await context.params;
  if (!invitationId.trim()) {
    return Response.json({ error: "Missing invitationId" }, { status: 400 });
  }

  const invitation = await getPendingTeamInvitationForEmailById(
    invitationId,
    email,
  );
  if (!invitation) {
    return Response.json({ error: "Invitation not found" }, { status: 404 });
  }

  await addUserToTeam({
    teamId: invitation.teamId,
    userId: session.user.id,
    role: invitation.role,
  });

  await updateTeamInvitationStatus({
    invitationId,
    status: "accepted",
  });

  const sessionToken = await encryptJWE(
    {
      ...session,
      activeTeamId: invitation.teamId,
    },
    "1y",
  );

  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, sessionToken, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  const teams = await listTeamsForUser(session.user.id);

  return Response.json({
    accepted: true,
    invitationId,
    team: {
      id: invitation.teamId,
      name: invitation.teamName,
    },
    activeTeamId: invitation.teamId,
    teams,
  });
}
