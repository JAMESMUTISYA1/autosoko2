import ProfileDetailsForm from "@/components/shared/ProfileDetailsForm";
import ChangePasswordForm from "@/components/shared/ChangePasswordForm";
import { getCurrentSellerStore } from "@/data/sellerData";

export default function SellerProfilePage() {
  const store = getCurrentSellerStore();

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl mb-1">Profile</h1>
      <p className="text-sm text-muted mb-8">Manage your account details and password.</p>

      <div className="space-y-6">
        <ProfileDetailsForm
          initialName={store.name}
          initialEmail={`${store.slug}@autosoko.africa`}
          initialPhone="+254712000555"
        />
        <ChangePasswordForm />
      </div>
    </div>
  );
}
