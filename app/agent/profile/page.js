import ProfileDetailsForm from "@/components/shared/ProfileDetailsForm";
import ChangePasswordForm from "@/components/shared/ChangePasswordForm";
import { agents } from "@/data/adminData";

const CURRENT_AGENT = agents[0];

export default function AgentProfilePage() {
  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl mb-1">Profile</h1>
      <p className="text-sm text-muted mb-8">Manage your account details and password.</p>

      <div className="space-y-6">
        <ProfileDetailsForm
          initialName={CURRENT_AGENT.name}
          initialEmail={CURRENT_AGENT.email}
          initialPhone={CURRENT_AGENT.phone}
        />
        <ChangePasswordForm />
      </div>
    </div>
  );
}
