import { listPendingTeamInvitationsForEmail } from "@/lib/db/teams";
import { getServerSession } from "@/lib/session/get-server-session";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const email = session.user.email?.trim();
  if (!email) {
    return Response.json({ invitations: [] });
  }

  const invitations = await listPendingTeamInvitationsForEmail(email);

  return Response.json({
    invitations: invitations.map((invitation) => ({
      id: invitation.id,
      teamId: invitation.teamId,
      teamName: invitation.teamName,
      role: invitation.role,
      invitedByUserId: invitation.invitedByUserId,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
    })),
  });
}
