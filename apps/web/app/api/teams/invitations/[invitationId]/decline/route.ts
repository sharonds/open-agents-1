import {
  getPendingTeamInvitationForEmailById,
  updateTeamInvitationStatus,
} from "@/lib/db/teams";
import { getServerSession } from "@/lib/session/get-server-session";

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
          "Your account does not have an email address. Add one before managing invitations.",
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

  await updateTeamInvitationStatus({
    invitationId,
    status: "declined",
  });

  return Response.json({
    declined: true,
    invitationId,
    teamId: invitation.teamId,
  });
}
